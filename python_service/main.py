"""
FastAPI — AI Form Generate Service
Runs on port 8001 alongside the NestJS backend (port 3001).

Endpoints:
  GET  /health                 - Service + Ollama status
  GET  /api/meta               - Departments, services, form types, existing categories/fields
  POST /api/srs/upload         - Upload SRS file → extract text
  POST /api/srs/generate       - SRS text + context → Ollama JSON
  POST /api/srs/insert         - Approve generated JSON → DB insert (with versioning)
  GET  /api/forms              - List all generated forms
"""
import os
import json
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from srs_reader        import extract_text
from ai_service        import srs_text_to_json, check_ollama_connection, srs_to_document_checklist_json, srs_to_workflow_json, split_srs_sections
from db_insert         import insert_form, insert_documents_only, insert_workflow, get_existing_workflow, get_roles_for_context
from versioning        import check_version, deactivate_old_form, delete_old_form
from db                import get_connection, get_cursor
from validate_json     import validate_generated_json
from json_fixer        import fix_generated_json
from fastapi import APIRouter, HTTPException
import asyncio

load_dotenv()

app = FastAPI(
    title="SWCS AI Form Generator",
    version="1.0.0",
    description="Upload SRS → Ollama (qwen2.5-coder) → DB-ready JSON → Insert into m_fb_* tables",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001","http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models ───────────────────────────────────────────────────────────

# In-memory cache: filename → bytes (cleared after generate call)
_file_cache: dict[str, bytes] = {}


class GenerateRequest(BaseModel):
    srs_text:      str
    department_id: int
    service_id:    str
    form_type_id:  int
    filename:      str = ""   # original filename — used for File API on large SRS


class InsertRequest(BaseModel):
    generated_json:    dict[str, Any]
    checklist_json:    dict[str, Any]
    workflow_json:     dict[str, Any] | None = None
    force_new_version: bool = False


# ── Debug ─────────────────────────────────────────────────────────────────────

@app.get("/api/debug")
def debug_meta():
    """Raw query debug — shows exact errors and column names for each table."""
    conn = get_connection()
    conn.autocommit = True
    cur  = get_cursor(conn)
    results = {}

    queries = {
        "services_active":    'SELECT id, service_id, service_name, department_id FROM m_service WHERE "isActive" = true LIMIT 3',
        "services_all":       "SELECT id, service_id, service_name, department_id FROM m_service LIMIT 3",
        "form_types_active":  'SELECT id, name, abbr FROM m_fb_form_types WHERE "isActive" = true LIMIT 5',
        "form_types_all":     "SELECT id, name, abbr FROM m_fb_form_types LIMIT 5",
        "service_columns":    "SELECT column_name FROM information_schema.columns WHERE table_name='m_service' ORDER BY ordinal_position",
        "formtypes_columns":  "SELECT column_name FROM information_schema.columns WHERE table_name='m_fb_form_types' ORDER BY ordinal_position",
    }

    for key, sql in queries.items():
        try:
            cur.execute(sql)
            results[key] = {"ok": True, "rows": [dict(r) for r in cur.fetchall()]}
        except Exception as e:
            results[key] = {"ok": False, "error": str(e)}

    cur.close()
    conn.close()
    return results


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    ollama = check_ollama_connection()
    return {
        "service": "SWCS AI Form Generator",
        "status":  "ok",
        "ollama":  ollama,
    }


# ── Meta — Dropdowns for upload form ─────────────────────────────────────────

@app.get("/api/meta")
def get_meta():
    """Return departments, services, form types, existing categories and fields."""
    conn = get_connection()
    conn.autocommit = True          # each query runs independently — no aborted-tx cascade
    cur  = get_cursor(conn)

    try:
        cur.execute('SELECT id, name FROM m_departments WHERE "isActive" = true ORDER BY id')
        departments = [dict(r) for r in cur.fetchall()]
    except Exception:
        try:
            cur.execute("SELECT id, name FROM m_departments ORDER BY id")
            departments = [dict(r) for r in cur.fetchall()]
        except Exception:
            departments = []

    try:
        cur.execute(
            'SELECT s.id, s.service_id, s.service_name AS name, s.department_id'
            ' FROM m_service s WHERE s."isActive" = true ORDER BY s.id'
        )
        services = [dict(r) for r in cur.fetchall()]
    except Exception:
        try:
            cur.execute(
                "SELECT s.id, s.service_id, s.service_name AS name, s.department_id"
                " FROM m_service s ORDER BY s.id"
            )
            services = [dict(r) for r in cur.fetchall()]
        except Exception:
            services = []

    try:
        cur.execute('SELECT id, name, abbr FROM m_fb_form_types WHERE "isActive" = true ORDER BY id')
        form_types = [dict(r) for r in cur.fetchall()]
    except Exception:
        try:
            cur.execute("SELECT id, name, abbr FROM m_fb_form_types ORDER BY id")
            form_types = [dict(r) for r in cur.fetchall()]
        except Exception:
            form_types = []

    try:
        cur.execute(
            "SELECT id, category_name, category_code FROM m_fb_form_categories "
            "WHERE is_active = true ORDER BY id"
        )
        categories = [dict(r) for r in cur.fetchall()]
    except Exception:
        categories = []

    try:
        cur.execute(
            "SELECT id, name, formchk_id FROM m_fb_form_field "
            "WHERE is_formvar_active = true ORDER BY id"
        )
        fields = [dict(r) for r in cur.fetchall()]
    except Exception:
        fields = []

    cur.close()
    conn.close()

    return {
        "departments":          departments,
        "services":             services,
        "form_types":           form_types,
        "existing_categories":  categories,
        "existing_fields":      fields,
    }


# ── Step 1: Upload SRS file → extract text ───────────────────────────────────

@app.post("/api/srs/upload")
async def upload_srs(file: UploadFile = File(...)):
    """
    Upload PDF, DOCX, or TXT file.
    Returns extracted text for review before AI processing.
    """
    allowed = {"pdf", "docx", "doc", "txt"}
    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""

    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(allowed)}"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        text = extract_text(file.filename, content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read file: {str(e)}")

    # Cache file bytes for File API usage in generate step (large SRS)
    _file_cache[file.filename] = content

    return {
        "success":   True,
        "filename":  file.filename,
        "file_size": len(content),
        "text":      text,
        "text_length": len(text),
    }


# ── Step 2: Generate JSON from SRS text via Ollama ───────────────────────────

@app.post("/api/srs/generate")
def generate_json(req: GenerateRequest):
    """
    Send SRS text + context to Ollama (qwen2.5-coder) → DB-ready JSON.
    Returns JSON for admin preview before DB insert.
    """
    if not req.srs_text.strip():
        raise HTTPException(status_code=400, detail="srs_text cannot be empty")

    # Fetch existing DB data for AI context
    conn = get_connection()
    conn.autocommit = True
    cur  = get_cursor(conn)
    try:
        cur.execute(
            "SELECT id, category_name, category_code FROM m_fb_form_categories "
            "WHERE is_active = true ORDER BY id"
        )
        existing_cats = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "SELECT id, name, formchk_id FROM m_fb_form_field "
            "WHERE is_formvar_active = true ORDER BY id"
        )
        existing_fields = [dict(r) for r in cur.fetchall()]

        cur.execute(
            "select id,master_name,master_code,description from master_tables WHERE is_active='1' ORDER BY id ASC"
        )
        existing_masters = [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

    # Retrieve cached file bytes (set during /api/srs/upload)
    cached_bytes = _file_cache.pop(req.filename, None) if req.filename else None

    try:
        generated = srs_text_to_json(
            srs_text=req.srs_text,
            department_id=req.department_id,
            service_id=req.service_id,
            form_type_id=req.form_type_id,
            existing_categories=existing_cats,
            existing_fields=existing_fields,
            existing_masters=existing_masters,
            file_bytes=cached_bytes,
            filename=req.filename or None,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # Auto-fix common AI mistakes before validation
    generated, fixes_applied = fix_generated_json(generated)

    # Auto-validate the fixed JSON
    try:
        validation = validate_generated_json(generated)
    except Exception as val_err:
        validation = {
            "is_valid": True,
            "errors": [],
            "warnings": [f"Validation skipped due to internal error: {val_err}"],
            "stats": {},
        }

    # Check versioning status
    version_info = check_version(
        department_id=req.department_id,
        service_id=req.service_id,
        form_type_id=req.form_type_id,
        new_payload=generated,
    )

    return {
        "success":        True,
        "generated_json": generated,
        "version_info":   version_info,
        "validation":     validation,   # ← errors/warnings shown in preview
        "fixes_applied":  fixes_applied,  # ← what was auto-corrected
        "summary":        validation["stats"],
    }


# ── Step 3: Approve & Insert into DB ─────────────────────────────────────────

@app.post("/api/srs/insert")
def insert_to_db(req: InsertRequest):
    """
    Admin approves generated JSON → insert into m_fb_* tables.
    Handles versioning automatically.
    """
    payload = req.generated_json
    meta    = payload.get("meta", {})

    dept_id     = meta.get("department_id")
    service_id  = meta.get("service_id")
    form_type_id = meta.get("form_type_id")

    if not all([dept_id, service_id, form_type_id]):
        raise HTTPException(
            status_code=400,
            detail="generated_json.meta must include department_id, service_id, form_type_id"
        )

    # Auto-fix before validation (handles any edits made in preview)
    payload, _ = fix_generated_json(payload)

    # Validate before insert — block if critical errors found
    validation = validate_generated_json(payload)
    if not validation["is_valid"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "JSON validation failed. Fix errors before inserting.",
                "errors":  validation["errors"],
                "warnings": validation["warnings"],
            }
        )

    # Determine version
    version_info = check_version(dept_id, service_id, form_type_id, payload)

    if version_info["action"] == "NO_CHANGE" and not req.force_new_version:
        return {
            "success": False,
            "action":  "NO_CHANGE",
            "message": "Form already exists with no changes detected. "
                       "No new version created. Pass force_new_version=true to override.",
            "existing_version": version_info["version"],
        }

    # force_new_version=True with NO_CHANGE → treat as NEW_VERSION (re-insert same data)
    if version_info["action"] == "NO_CHANGE" and req.force_new_version:
        version_info["action"] = "NEW_VERSION"

    if version_info["action"] == "NEW_VERSION":
        # Hard-delete old form — deactivate alone cannot release the unique constraint
        # on m_fb_form_mapping(department_id, service_id, form_type_id)
        delete_old_form(version_info["old_mapping_id"], service_id, form_type_id)

    form_version = version_info["version"]

    try:
        result = insert_form(payload, form_version=form_version)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {str(e)}")

    return {
        "success":      True,
        "action":       version_info["action"],
        "form_version": form_version,
        "mapping_id":   result["mapping_id"],
        "form_code":    result["form_code"],
        "service_id":   result["service_id"],
        "changes":      version_info.get("changes", []),
        "validation":   {"warnings": validation["warnings"]},
        "message": (
            f"Form inserted successfully as {form_version}."
            if version_info["action"] == "INSERT_NEW"
            else f"Form updated to {form_version}. Previous version deactivated."
        ),
    }


# ── List generated forms ──────────────────────────────────────────────────────

@app.get("/api/forms")
def list_forms():
    """List all AI-generated forms in m_fb_form_mapping."""
    conn = get_connection()
    cur  = get_cursor(conn)
    try:
        cur.execute(
            """SELECT
                   fm.id, fm.department_id, fm.service_id, fm.form_type_id,
                   fm.form_name, fm.form_code, fm.form_version, fm.is_active,
                   ft.name AS form_type_name,
                   COUNT(DISTINCT pm.id) AS page_count,
                   COUNT(DISTINCT bf.id) AS field_count
               FROM m_fb_form_mapping fm
               LEFT JOIN m_fb_form_types ft ON ft.id = fm.form_type_id
               LEFT JOIN m_fb_page_master pm ON pm.form_id = fm.id
               LEFT JOIN m_fb_form_builder_fields bf ON bf.form_id = fm.id
               GROUP BY fm.id, fm.department_id, fm.service_id, fm.form_type_id,
                        fm.form_name, fm.form_code, fm.form_version, fm.is_active, ft.name
               ORDER BY fm.id DESC"""
        )
        forms = [dict(r) for r in cur.fetchall()]
        return {"forms": forms, "total": len(forms)}
    finally:
        cur.close()
        conn.close()



@app.post("/api/checklist")
def test_document_checklist(srs_text: str = Form(...), service_id: str = Form(...)):

    conn = get_connection()
    conn.autocommit = True
    cur  = get_cursor(conn)

    try:
        cur.execute("""
            SELECT
                mfb.id,
                mfb.service_id,
                ms.service_name,
                mfb.form_id,
                ft.name AS form_type,
                mfb.page_id,
                pm.page_name,
                mfb.category_id,
                mc.category_name,
                mc.category_code,
                mff.formchk_id AS form_field_id,
                mff.name AS field_name,
                mfb.input_type,
                mffo.source_type,
                mffo.master_table_id,
                mffo.static_options

            FROM m_fb_form_builder_fields mfb

            INNER JOIN m_fb_form_categories mc
                ON mfb.category_id = mc.id

            INNER JOIN m_fb_page_master pm
                ON mfb.page_id = pm.id

            INNER JOIN m_fb_form_types ft
                ON mfb.form_id = ft.id

            INNER JOIN m_service ms
                ON mfb.service_id = ms.service_id

            INNER JOIN m_fb_form_field mff
                ON mfb.form_field_id = mff.id

            LEFT JOIN m_fb_formfield_options mffo
                ON mfb.id = mffo.builder_field_id
        """)

        existing_fields = [dict(r) for r in cur.fetchall()]

        cur.execute("""
        SELECT * FROM m_documenttypes 
        """)

        document_types=[dict(r) for r in cur.fetchall()]

        cur.execute("""
        SELECT * from m_document_master 
        """)

        document_master=[dict(r) for r in cur.fetchall()]



    finally:
        cur.close()
        conn.close()


    """
    Quick test endpoint to verify document checklist AI generation.
    No DB calls, no caching — just AI response.
    """

    try:
        result = srs_to_document_checklist_json(
            srs_text=srs_text,
            service_id=service_id,
            field_data=existing_fields,
            document_master=document_master,
            document_types=document_types
        )

        return result
        

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Checklist generation failed: {str(e)}"
        )

from fastapi import Body

@app.post("/api/insert")
def insert_checklist(payload: dict = Body(...)):

    conn = get_connection()
    conn.autocommit = False
    cur  = get_cursor(conn)

    try:
        # insert documents only
        payload, dcl_map = insert_documents_only(payload, cur)

        conn.commit()

        # STEP 2: Update service table
        if payload:
            cur.execute(
                """UPDATE m_service 
                SET "dms" = %s 
                WHERE service_id = %s""",
                (json.dumps(payload), "591.0")
            )

        conn.commit()

        return {
            "success": True,
            "dcl_map": dcl_map,
            "message": "Inserted + Updated service"
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Insertion failed: {str(e)}"
        )

    finally:
        cur.close()
        conn.close()


async def generate_full_payload_async(req):

    # ── FETCH CONTEXT (sync DB → wrap in thread) ───────
    def fetch_data():
        conn = get_connection()
        conn.autocommit = True
        cur = get_cursor(conn)

        try:
            cur.execute("""
                SELECT id, category_name, category_code 
                FROM m_fb_form_categories 
                WHERE is_active = true
            """)
            existing_cats = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT id, name, formchk_id 
                FROM m_fb_form_field 
                WHERE is_formvar_active = true
            """)
            existing_fields = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT id, master_name, master_code, description 
                FROM master_tables 
                WHERE is_active='1'
            """)
            existing_masters = [dict(r) for r in cur.fetchall()]

            cur.execute("SELECT * FROM m_documenttypes")
            document_types = [dict(r) for r in cur.fetchall()]

            cur.execute("SELECT * FROM m_document_master")
            document_master = [dict(r) for r in cur.fetchall()]

        finally:
            cur.close()
            conn.close()

        return existing_cats, existing_fields, existing_masters, document_types, document_master

    (
        existing_cats,
        existing_fields,
        existing_masters,
        document_types,
        document_master
    ) = await asyncio.to_thread(fetch_data)

    # Fetch roles + form_types for workflow agent
    def fetch_workflow_context():
        conn = get_connection()
        cur  = get_cursor(conn)
        try:
            roles = get_roles_for_context()
            try:
                cur.execute('SELECT id, name AS type_name FROM m_fb_form_types WHERE "isActive" = true ORDER BY id')
                fts = [dict(r) for r in cur.fetchall()]
                if not fts:
                    cur.execute("SELECT id, name AS type_name FROM m_fb_form_types ORDER BY id")
                    fts = [dict(r) for r in cur.fetchall()]
            except Exception:
                fts = []
            return roles, fts
        finally:
            cur.close()
            conn.close()

    roles, form_types = await asyncio.to_thread(fetch_workflow_context)
    file_bytes = _file_cache.get(req.filename)

    # ── Section-aware token optimisation ─────────────────────────────────────
    # Split SRS text into 3 targeted sections so each agent only reads its part.
    # Agent 1 still uses File API (needs full doc for form fields).
    # Agents 2 & 3 use text-only mode with their specific section — avoids
    # re-processing the full PDF (~50K tokens) twice more.
    sections = split_srs_sections(req.srs_text)

    # ── Mock mode: simulate AI processing time (2.5 minutes) ─────────────────
    if os.getenv("AI_MODE", "") == "mock":
        await asyncio.sleep(100)   # 150 seconds = 2.5 minutes

    # ── 3 SEQUENTIAL AI CALLS (free tier: 250k tokens/min shared) ────────────
    # Sequential prevents rate-limit collisions across 3 keys.
    # Each call is wrapped to show WHICH agent/key failed.

    try:
        form_json = await asyncio.to_thread(
            srs_text_to_json,
            srs_text=sections["form"],
            department_id=req.department_id,
            service_id=req.service_id,
            form_type_id=req.form_type_id,
            existing_categories=existing_cats,
            existing_fields=existing_fields,
            existing_masters=existing_masters,
            file_bytes=file_bytes,          # Agent 1 keeps File API for quality
            filename=req.filename or None,
        )
    except Exception as e:
        raise RuntimeError(f"[Agent 1 — GEMINI_API_KEY1] Form generation failed: {e}")

    try:
        checklist_json = await asyncio.to_thread(
            srs_to_document_checklist_json,
            srs_text=sections["documents"],
            service_id=req.service_id,
            field_data=existing_fields,
            document_master=document_master,
            document_types=document_types,
            file_bytes=None,                # Agent 2: text-only, documents section only
            filename=None,
        )
    except Exception as e:
        raise RuntimeError(f"[Agent 2 — GEMINI_API_KEY2] Checklist generation failed: {e}")

    workflow_json  = None
    workflow_error = None
    try:
        workflow_json = await asyncio.to_thread(
            srs_to_workflow_json,
            sections["workflow"],           # Agent 3: text-only, workflow section only
            req.department_id,
            req.service_id,
            roles,
            form_types,
            None,                           # no file upload for Agent 3
            None,
        )
    except Exception as e:
        workflow_error = f"[Agent 3 — GEMINI_API_KEY3] Workflow generation failed: {e}"
        print(workflow_error)

    return {
        "form_json":      form_json,
        "checklist_json": checklist_json,
        "workflow_json":  workflow_json,
        "workflow_error": workflow_error,
    }


@app.post("/api/srs/full-generate")
async def full_generate(req: GenerateRequest):

    if not req.srs_text.strip():
        raise HTTPException(status_code=400, detail="srs_text cannot be empty")

    try:
        result = await generate_full_payload_async(req)

        generated_form = result.get("form_json")
        generated, fixes_applied = fix_generated_json(generated_form)

        try:
            validation = validate_generated_json(generated)
        except Exception as val_err:
            validation = {
                "is_valid": True,
                "errors": [],
                "warnings": [f"Validation skipped due to internal error: {val_err}"],
                "stats": {},
            }

        version_info = check_version(
            department_id=req.department_id,
            service_id=req.service_id,
            form_type_id=req.form_type_id,
            new_payload=generated,
        )

        return {
            "success":        True,
            "generated_json": generated,
            "validation":     validation,
            "version_info":   version_info,
            "fixes_applied":  fixes_applied,
            "summary":        validation["stats"],
            "checklist_json": result["checklist_json"],
            "workflow_json":  result.get("workflow_json"),
            "workflow_error": result.get("workflow_error"),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Async generation failed: {str(e)}"
        )


@app.post("/api/srs/insert-full")
def insert_full_payload(req: InsertRequest):
    payload = req.generated_json
    checklist_payload = req.checklist_json
    
    # 1. METADATA VALIDATION (from insert_to_db)
    meta = payload.get("meta", {})
    dept_id = meta.get("department_id")
    service_id = meta.get("service_id")
    form_type_id = meta.get("form_type_id")

    if not all([dept_id, service_id, form_type_id]):
        raise HTTPException(status_code=400, detail="Metadata missing")

    # 2. AUTO-FIX & VALIDATE (from insert_to_db)
    payload, _ = fix_generated_json(payload)
    validation = validate_generated_json(payload)
    if not validation["is_valid"]:
        raise HTTPException(status_code=422, detail={"errors": validation["errors"]})

    # 3. VERSIONING (from insert_to_db)
    version_info = check_version(dept_id, service_id, form_type_id, payload)
    if version_info["action"] == "NO_CHANGE" and not req.force_new_version:
        return {"success": False, "message": "No changes detected."}

    # force_new_version=True with NO_CHANGE → treat as NEW_VERSION (re-insert same data)
    if version_info["action"] == "NO_CHANGE" and req.force_new_version:
        version_info["action"] = "NEW_VERSION"

    # 4. ATOMIC DATABASE TRANSACTION
    conn = get_connection()
    conn.autocommit = False
    cur = get_cursor(conn)

    try:
        # Step A: Hard-delete old form so unique constraint is released for re-insert
        if version_info["action"] == "NEW_VERSION":
            delete_old_form(version_info["old_mapping_id"], service_id, form_type_id)

        # Step B: Insert Form (from insert_to_db)
        form_version = version_info["version"]
        form_res = insert_form(payload, form_version=form_version)

        # Step C: Insert Documents (from insert_checklist)
        dms_payload, dcl_map = insert_documents_only(checklist_payload, cur)

        # Step D: Update Service Table (from insert_checklist)
        if dms_payload:
            cur.execute(
                'UPDATE m_service SET "dms" = %s WHERE service_id = %s',
                (json.dumps(dms_payload), str(service_id))
            )

        # COMMIT EVERYTHING
        conn.commit()

        # Step E: Insert Workflow (non-atomic — separate commit, non-fatal)
        workflow_result = None
        if req.workflow_json:
            try:
                workflow_result = insert_workflow(dept_id, service_id, req.workflow_json)
                # Insert officer forms — meta already has department_id, service_id, form_type_id
                for officer_form in req.workflow_json.get("officer_forms", []):
                    meta = officer_form.get("meta", {})
                    ftype_id = meta.get("form_type_id") or officer_form.get("form_type_id")
                    if not ftype_id:
                        continue
                    try:
                        # Ensure meta has all required fields
                        officer_form.setdefault("meta", {})
                        officer_form["meta"].setdefault("department_id", dept_id)
                        officer_form["meta"].setdefault("service_id", service_id)
                        officer_form["meta"]["form_type_id"] = ftype_id
                        insert_form(officer_form, form_version="v1")
                    except Exception:
                        pass
            except Exception as wf_err:
                workflow_result = {"error": str(wf_err)}

        # 5. RESPONSE
        return {
            "success":      True,
            "action":       version_info["action"],
            "form_version": form_version,
            "mapping_id":   form_res["mapping_id"],
            "form_code":    form_res["form_code"],
            "service_id":   form_res["service_id"],
            "changes":      version_info.get("changes", []),
            "dcl_map":      dcl_map,
            "workflow":     workflow_result,
            "message":      f"Form {form_version}, Checklist" + (" and Workflow" if workflow_result and "error" not in workflow_result else "") + " inserted successfully.",
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Atomic insert failed: {str(e)}")
    finally:
        cur.close()
        conn.close()


# ── Agent 3: Workflow Configuration ───────────────────────────────────────────

class WorkflowGenerateRequest(BaseModel):
    srs_text:      str
    department_id: int
    service_id:    str
    filename:      str = ""


class WorkflowInsertRequest(BaseModel):
    workflow_json: dict[str, Any]
    department_id: int
    service_id:    str
    force_replace: bool = False


@app.post("/api/workflow/generate")
async def generate_workflow(
    file: UploadFile = File(None),
    srs_text: str = Form(""),
    department_id: int = Form(...),
    service_id: str = Form(...),
):
    """
    Agent 3 — Generate workflow configuration JSON from SRS.
    Upload PDF file OR pass srs_text.
    """
    try:
        file_bytes = None
        filename   = ""

        if file:
            file_bytes = await file.read()
            filename   = file.filename
            _file_cache[filename] = file_bytes
            if not srs_text.strip():
                srs_text = extract_text(filename, file_bytes)

        if not srs_text.strip() and not file_bytes:
            raise HTTPException(status_code=400, detail="Provide a file or srs_text")

        # Fetch roles and form_types from DB as context for AI
        roles = get_roles_for_context()

        conn = get_connection()
        cur  = get_cursor(conn)
        try:
            cur.execute('SELECT id, name AS type_name FROM m_fb_form_types WHERE "isActive" = true ORDER BY id')
            form_types = [dict(r) for r in cur.fetchall()]
            if not form_types:
                cur.execute("SELECT id, name AS type_name FROM m_fb_form_types ORDER BY id")
                form_types = [dict(r) for r in cur.fetchall()]
        except Exception:
            form_types = []
        finally:
            cur.close()
            conn.close()

        # Fetch existing workflow steps (for info)
        existing = get_existing_workflow(department_id, service_id)

        # Generate workflow JSON via AI (workflow_steps + officer_forms)
        workflow_json = srs_to_workflow_json(
            srs_text=srs_text,
            department_id=department_id,
            service_id=service_id,
            roles=roles,
            form_types=form_types,
            file_bytes=file_bytes,
            filename=filename,
        )

        return {
            "success": True,
            "workflow_json": workflow_json,
            "existing_steps": len(existing),
            "roles_available": len(roles),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow generation failed: {str(e)}")


@app.post("/api/workflow/insert")
def insert_workflow_config(req: WorkflowInsertRequest):
    """
    Insert workflow configuration into c_application_workflow_configuration.
    Also inserts officer_forms into m_fb_* tables (one per department step).
    Set force_replace=True to overwrite existing workflow for this service.
    """
    try:
        existing = get_existing_workflow(req.department_id, req.service_id)

        if existing and not req.force_replace:
            return {
                "success": False,
                "message": f"Workflow already exists ({len(existing)} steps). Set force_replace=True to overwrite.",
                "existing_steps": len(existing),
            }

        # 1. Insert workflow steps
        result = insert_workflow(req.department_id, req.service_id, req.workflow_json)

        # 2. Insert officer forms (one per department step)
        officer_forms = req.workflow_json.get("officer_forms", [])
        forms_inserted = []
        forms_errors   = []
        for officer_form in officer_forms:
            try:
                meta = officer_form.get("meta", {})
                form_type_id = meta.get("form_type_id") or officer_form.get("form_type_id")
                if not form_type_id:
                    continue
                # Ensure meta has dept/service in case AI omitted them
                officer_form.setdefault("meta", {})
                officer_form["meta"].setdefault("department_id", req.department_id)
                officer_form["meta"].setdefault("service_id", req.service_id)
                officer_form["meta"]["form_type_id"] = form_type_id
                form_res = insert_form(officer_form, form_version="v1")
                forms_inserted.append({
                    "step": officer_form.get("step"),
                    "form_type_id": form_type_id,
                    "mapping_id": form_res.get("mapping_id"),
                })
            except Exception as form_err:
                forms_errors.append({
                    "step": officer_form.get("step"),
                    "error": str(form_err),
                })

        return {
            "success": True,
            "workflow_inserted": result["inserted"],
            "step_ids": result["step_ids"],
            "officer_forms_inserted": len(forms_inserted),
            "officer_forms_errors": forms_errors,
            "message": f"{result['inserted']} workflow steps + {len(forms_inserted)} officer forms inserted.",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow insert failed: {str(e)}")


@app.get("/api/workflow/{service_id}")
def get_workflow(service_id: str, department_id: int = 0):
    """Get existing workflow steps for a service."""
    try:
        conn = get_connection()
        cur  = get_cursor(conn)
        query = """
            SELECT id, step, role_id, jurisdiction_level, sla_hours,
                   action_allowed_json, transition_map_json, status, config_version
            FROM c_application_workflow_configuration
            WHERE service_id = %s
        """
        params = [service_id]
        if department_id:
            query += " AND department_id = %s"
            params.append(department_id)
        query += " ORDER BY config_version DESC, step ASC"

        cur.execute(query, params)
        steps = [dict(r) for r in cur.fetchall()]
        cur.close()
        conn.close()

        return {"success": True, "service_id": service_id, "steps": steps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
