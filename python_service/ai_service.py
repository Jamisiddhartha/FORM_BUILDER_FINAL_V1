"""
AI Service — uses remote/local Ollama (qwen2.5-coder) to convert SRS text into DB-ready JSON.

Supports two modes (set in .env):
  AI_MODE=ollama      → Direct Ollama API  (port 11434)  e.g. http://93.127.194.188:11434
  AI_MODE=openwebui   → Open WebUI API     (port 8080)   e.g. http://93.127.194.188:8080

No paid API needed — free remote model on your server.
"""
import os
import json
import re
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def split_srs_sections(srs_text: str) -> dict:
    """
    Split SRS text into 3 targeted sections — one per AI agent.
    Returns: {"form": str, "documents": str, "workflow": str}

    Each value contains only the relevant section text so the agent
    doesn't waste tokens processing unrelated content.
    Falls back to full text for any section that can't be isolated.
    """
    FULL = {"form": srs_text, "documents": srs_text, "workflow": srs_text}

    # Not worth splitting small docs — overhead > saving
    if len(srs_text) < 5000:
        return FULL

    lines = srs_text.splitlines()

    # ── Keyword patterns for each section type ────────────────────────────────
    DOC_KW = re.compile(
        r'\b(documents?\s+required|document\s+checklist|required\s+documents?|'
        r'enclosures?|annexures?|supporting\s+documents?|attachments?|'
        r'documents?\s+to\s+be\s+submitted|upload\s+documents?|'
        r'list\s+of\s+documents?)\b',
        re.IGNORECASE,
    )
    WF_KW = re.compile(
        r'\b(workflow|process\s+flow|approval\s+(process|chain|flow|stages?)|'
        r'levels?\s+of\s+(approval|scrutiny)|processing\s+stages?|'
        r'sla|scrutiny\s+process|inspection\s+(process|flow)|'
        r'application\s+processing|department\s+process|disposal\s+process)\b',
        re.IGNORECASE,
    )

    # A line is a section header if it's short, possibly numbered/capped
    def _is_header(line: str) -> bool:
        s = line.strip()
        if not s or len(s) > 110:
            return False
        return bool(
            re.match(r'^(\d+[\.\)]\s|#{1,4}\s|Section\s+\d)', s)
            or (s == s.upper() and 5 < len(s) < 90)
        )

    # Find section boundary lines
    doc_starts: list[int]  = []
    wf_starts:  list[int]  = []

    for i, line in enumerate(lines):
        if not _is_header(line):
            continue
        if DOC_KW.search(line):
            doc_starts.append(i)
        elif WF_KW.search(line):
            wf_starts.append(i)

    # Need at least one boundary to do anything useful
    if not doc_starts and not wf_starts:
        print("[section-split] No section headers found — using full SRS for all agents")
        return FULL

    # ── Build ordered list of (line_idx, type) boundaries ────────────────────
    boundaries: list[tuple[int, str]] = []
    for idx in doc_starts[:1]:   # only first detected doc section
        boundaries.append((idx, "documents"))
    for idx in wf_starts[:1]:    # only first detected wf section
        boundaries.append((idx, "workflow"))
    boundaries.sort()

    # Compute text for each detected section (from its header to next boundary)
    section_texts: dict[str, str] = {}
    all_starts = [0] + [b[0] for b in boundaries] + [len(lines)]
    for k, (start, typ) in enumerate(boundaries):
        end = all_starts[k + 2]  # start of next section after this one
        section_texts[typ] = "\n".join(lines[start:end])

    result = dict(FULL)  # default = full text

    # Documents section
    if "documents" in section_texts and len(section_texts["documents"]) >= 300:
        result["documents"] = section_texts["documents"]

    # Workflow section
    if "workflow" in section_texts and len(section_texts["workflow"]) >= 300:
        result["workflow"] = section_texts["workflow"]

    # Form section = everything BEFORE the first detected boundary (+ context after if no doc/wf)
    first_boundary = boundaries[0][0] if boundaries else len(lines)
    form_text = "\n".join(lines[:first_boundary])
    if len(form_text) >= 2000:
        result["form"] = form_text
    # If form section is tiny, keep full text for Agent 1
    elif len(form_text) < 2000:
        result["form"] = srs_text

    for typ in ("form", "documents", "workflow"):
        pct = int(100 * len(result[typ]) / max(len(srs_text), 1))
        print(f"[section-split] {typ}: {len(result[typ]):,} chars ({pct}% of full SRS)")

    return result


GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")   # Agent 1 — form fields
GEMINI_API_KEY2 = os.getenv("GEMINI_API_KEY2", "")  # Agent 2 — document checklist
GEMINI_API_KEY3 = os.getenv("GEMINI_API_KEY3", "")  # Agent 3 — workflow config
# AI_MODE: "mock" | "ollama" | "openwebui" | "gemini"
AI_MODE        = os.getenv("AI_MODE", "")

SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "system_prompt.txt")

Document_SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "document_prompt.txt")


def load_system_prompt() -> str:
    with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()

def load_document_system_prompt() -> str:
    with open(Document_SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()



# def _clean_json_response(raw: str) -> str:
#     """Clean LLM JSON output and attempt repair."""

#     raw = raw.strip()

#     # Remove markdown fences
#     raw = re.sub(r"^```(?:json)?\s*", "", raw)
#     raw = re.sub(r"\s*```$", "", raw)
#     raw = raw.strip()

#     # Extract JSON if extra text exists
#     start = raw.find("{")
#     end = raw.rfind("}")
#     if start != -1 and end != -1:
#         raw = raw[start:end + 1]

#     # Fix common LLM mistakes
#     raw = raw.replace('"null"', "null")

#     # Remove trailing commas
#     raw = re.sub(r",\s*}", "}", raw)
#     raw = re.sub(r",\s*]", "]", raw)

#     # Try normal JSON parsing
#     try:
#         json.loads(raw)
#         return raw
#     except json.JSONDecodeError:
#         pass

#     # Try json-repair fallback
#     try:
#         from json_repair import repair_json
#         repaired = repair_json(raw, return_objects=False)
#         json.loads(repaired)
#         return repaired
#     except Exception:
#         return raw


def _clean_json_response(raw: str) -> str:
    """Strip markdown code fences, then attempt json-repair if parse fails."""
    raw = raw.strip()
    raw = re.sub(r"^(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*$", "", raw)
    raw = raw.strip()
    # Try native parse first
    try:
        json.loads(raw)
        return raw
    except json.JSONDecodeError:
        pass
    # Fallback: json-repair (handles truncated / malformed JSON)
    try:
        from json_repair import repair_json
        repaired = repair_json(raw, return_objects=False)
        json.loads(repaired)   # validate repair worked
        return repaired
    except Exception:
        return raw 


def _call_ollama(system_prompt: str, user_message: str) -> str:
    """Direct Ollama API call — port 11434."""
    host  = os.getenv("OLLAMA_HOST", "")
    model = os.getenv("OLLAMA_MODEL", "")
    if not host or not model:
        raise RuntimeError("OLLAMA_HOST and OLLAMA_MODEL must be set in .env")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 32768},
    }
    try:
        resp = requests.post(f"{host}/api/chat", json=payload, timeout=300)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {host}. "
            "Check server IP, port 11434, and firewall rules."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("Ollama request timed out (>5 min).")
    return resp.json()["message"]["content"]


def _call_openwebui(system_prompt: str, user_message: str) -> str:
    """Open WebUI OpenAI-compatible API — port 8080."""
    host  = os.getenv("OPENWEBUI_HOST", "")
    key   = os.getenv("OPENWEBUI_API_KEY", "")
    model = os.getenv("OLLAMA_MODEL", "")
    if not host or not model:
        raise RuntimeError("OPENWEBUI_HOST and OLLAMA_MODEL must be set in .env")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": 8192,
        "stream": False,
    }
    try:
        resp = requests.post(
            f"{host}/api/chat/completions",
            json=payload,
            headers=headers,
            timeout=300,
        )
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(f"Cannot connect to Open WebUI at {host}.")
    except requests.exceptions.Timeout:
        raise RuntimeError("Open WebUI request timed out (>5 min).")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(
            f"Open WebUI API error: {e.response.status_code} — {e.response.text[:200]}"
        )
    return resp.json()["choices"][0]["message"]["content"]


def _build_mock_json(department_id: int, service_id: str, form_type_id: int) -> dict:
    """
    MOCK MODE — returns a sample CAF-like form JSON without any AI call.
    Use this to test the full pipeline (upload → insert → versioning).
    Switch AI_MODE in .env when real AI is ready.
    """
    return {
        "meta": {
            "department_id": department_id,
            "service_id": service_id,
            "form_type_id": form_type_id,
            "form_name": "Mock CAF Application Form",
        },
        "categories": [
            {"ref": "$C1", "action": "INSERT_NEW", "category_name": "Company Details",
             "name_in_hindi": "कंपनी विवरण", "parent_id": 0, "is_active": True},
            {"ref": "$C2", "action": "INSERT_NEW", "category_name": "Promoter Details",
             "name_in_hindi": "प्रमोटर विवरण", "parent_id": 0, "is_active": True},
        ],
        "form_fields": [
            {"ref": "$F1", "action": "INSERT_NEW", "name": "Company Name",
             "name_in_hindi": "कंपनी का नाम", "category_ref": "$C1", "is_editable": "Y", "is_active": True},
            {"ref": "$F2", "action": "INSERT_NEW", "name": "Type of Proposal",
             "name_in_hindi": "प्रस्ताव का प्रकार", "category_ref": "$C1", "is_editable": "Y", "is_active": True},
            {"ref": "$F3", "action": "INSERT_NEW", "name": "Mobile Number",
             "name_in_hindi": "मोबाइल नंबर", "category_ref": "$C1", "is_editable": "Y", "is_active": True},
            {"ref": "$F4", "action": "INSERT_NEW", "name": "Email Address",
             "name_in_hindi": "ईमेल पता", "category_ref": "$C1", "is_editable": "Y", "is_active": True},
            {"ref": "$F5", "action": "INSERT_NEW", "name": "Promoter Name",
             "name_in_hindi": "प्रमोटर का नाम", "category_ref": "$C2", "is_editable": "Y", "is_active": True},
        ],
        "page_masters": [
            {"ref": "$P1", "page_name": "Company Details", "name_in_hindi": "कंपनी विवरण", "preference": 1},
            {"ref": "$P2", "page_name": "Promoter Details", "name_in_hindi": "प्रमोटर विवरण", "preference": 2},
        ],
        "page_category_mappings": [
            {"page_ref": "$P1", "category_ref": "$C1", "preference": 1, "help_text": None},
            {"page_ref": "$P2", "category_ref": "$C2", "preference": 1, "help_text": None},
        ],
        "builder_fields": [
            {"ref": "$BF1", "page_ref": "$P1", "category_ref": "$C1", "field_ref": "$F1",
             "preference": 1, "input_type": "text", "custom_label": "Name of Company/Unit",
             "placeholder": "Enter company name", "grid_span": 6,
             "is_required": "Y", "is_readonly": "N", "is_editable": "Y", "is_active": "Y",
             "min_length": None, "max_length": 200, "pattern": None, "validation_rule": None},
            {"ref": "$BF2", "page_ref": "$P1", "category_ref": "$C1", "field_ref": "$F2",
             "preference": 2, "input_type": "select", "custom_label": "Type of Proposal",
             "placeholder": "Select proposal type", "grid_span": 6,
             "is_required": "Y", "is_readonly": "N", "is_editable": "Y", "is_active": "Y",
             "min_length": None, "max_length": None, "pattern": None, "validation_rule": None},
            {"ref": "$BF3", "page_ref": "$P1", "category_ref": "$C1", "field_ref": "$F3",
             "preference": 3, "input_type": "tel", "custom_label": "Mobile Number",
             "placeholder": "Enter 10-digit mobile", "grid_span": 6,
             "is_required": "Y", "is_readonly": "N", "is_editable": "Y", "is_active": "Y",
             "min_length": 10, "max_length": 15, "pattern": None, "validation_rule": None},
            {"ref": "$BF4", "page_ref": "$P1", "category_ref": "$C1", "field_ref": "$F4",
             "preference": 4, "input_type": "email", "custom_label": "Email Address",
             "placeholder": "Enter email", "grid_span": 6,
             "is_required": "Y", "is_readonly": "N", "is_editable": "Y", "is_active": "Y",
             "min_length": None, "max_length": 100, "pattern": None, "validation_rule": None},
            {"ref": "$BF5", "page_ref": "$P2", "category_ref": "$C2", "field_ref": "$F5",
             "preference": 1, "input_type": "text", "custom_label": "Promoter Name",
             "placeholder": "Enter promoter name", "grid_span": 6,
             "is_required": "Y", "is_readonly": "N", "is_editable": "Y", "is_active": "Y",
             "min_length": None, "max_length": 100, "pattern": None, "validation_rule": None},
        ],
        "field_options": [
            {
                "builder_field_ref": "$BF2",
                "source_type": "STATIC",
                "static_options": [
                    {"label": "New Project",      "value": "new"},
                    {"label": "Expansion",        "value": "expansion"},
                    {"label": "Diversification",  "value": "diversification"},
                    {"label": "Modernization",    "value": "modernization"},
                ],
                "master_table_id": None,
                "parent_builder_field_ref": None,
            }
        ],
        "addmore_groups":   [],
        "addmore_columns":  [],
        "form_rules":       [],
    }


def _FORM_SCHEMA():
    """Strict JSON schema enforced by Gemini — prevents type errors in DB insert."""
    return {
        "type": "object",
        "properties": {
            "meta": {
                "type": "object",
                "properties": {
                    "department_id": {"type": "integer"},
                    "service_id":    {"type": "string"},
                    "form_type_id":  {"type": "integer"},
                    "form_name":     {"type": "string"},
                },
                "required": ["department_id", "service_id", "form_type_id", "form_name"],
            },
            "categories": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ref":           {"type": "string"},
                        "action":        {"type": "string", "enum": ["INSERT_NEW", "USE_EXISTING"]},
                        "existing_id":   {"type": "integer"},
                        "category_name": {"type": "string"},
                        "name_in_hindi": {"type": "string"},
                        "parent_id":     {"type": "integer"},
                        "is_active":     {"type": "boolean"},
                    },
                    "required": ["ref", "action", "category_name"],
                },
            },
            "form_fields": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ref":          {"type": "string"},
                        "action":       {"type": "string", "enum": ["INSERT_NEW", "USE_EXISTING"]},
                        "existing_id":  {"type": "integer"},
                        "name":         {"type": "string"},
                        "name_in_hindi":{"type": "string"},
                        "category_ref": {"type": "string"},
                        "is_editable":  {"type": "string", "enum": ["Y", "N"]},
                        "is_active":    {"type": "boolean"},
                    },
                    "required": ["ref", "action", "name"],
                },
            },
            "page_masters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ref":          {"type": "string"},
                        "page_name":    {"type": "string"},
                        "name_in_hindi":{"type": "string"},
                        "preference":   {"type": "integer"},
                    },
                    "required": ["ref", "page_name", "preference"],
                },
            },
            "page_category_mappings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "page_ref":     {"type": "string"},
                        "category_ref": {"type": "string"},
                        "preference":   {"type": "integer"},
                        "help_text":    {"type": "string"},
                    },
                    "required": ["page_ref", "category_ref", "preference"],
                },
            },
            "builder_fields": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ref":          {"type": "string"},
                        "page_ref":     {"type": "string"},
                        "category_ref": {"type": "string"},
                        "field_ref":    {"type": "string"},
                        "preference":   {"type": "integer"},
                        "input_type":   {"type": "string", "enum": ["text","number","select","date","radio","checkbox","textarea","file","tel","email","hidden","multiselect","datetime-local","button"]},
                        "custom_label": {"type": "string"},
                        "placeholder":  {"type": "string"},
                        "help_text":    {"type": "string"},
                        "grid_span":    {"type": "integer"},
                        "is_required":  {"type": "string", "enum": ["Y", "N"]},
                        "is_readonly":  {"type": "string", "enum": ["Y", "N"]},
                        "is_editable":  {"type": "string", "enum": ["Y", "N"]},
                        "is_active":    {"type": "string", "enum": ["Y", "N"]},
                        "min_length":   {"type": "integer"},
                        "max_length":   {"type": "integer"},
                        "pattern":      {"type": "string"},
                    },
                    "required": ["ref", "page_ref", "category_ref", "field_ref", "preference", "input_type", "is_required", "is_active"],
                },
            },
            "field_options": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "builder_field_ref":        {"type": "string"},
                        "source_type":              {"type": "string", "enum": ["STATIC", "MASTER"]},
                        "static_options": {
                            "type": "array",
                            "description": "REAL options extracted from SRS document. NEVER use placeholder values like 'Option 1'. Each label must be the actual option text from SRS; value must be lowercase_snake_case.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "label": {"type": "string", "description": "Actual option text from SRS document (e.g. 'New Project', 'Manufacturing', 'Yes')"},
                                    "value": {"type": "string", "description": "Lowercase snake_case of label (e.g. 'new_project', 'manufacturing', 'yes')"},
                                },
                                "required": ["label", "value"],
                            },
                        },
                        "master_table_id":          {"type": "integer"},
                        "parent_builder_field_ref": {"type": "string"},
                    },
                    "required": ["builder_field_ref", "source_type"],
                },
            },
            "addmore_groups": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "ref":                       {"type": "string"},
                        "page_ref":                  {"type": "string"},
                        "category_ref":              {"type": "string"},
                        "trigger_builder_field_ref": {"type": "string"},
                        "label":                     {"type": "string"},
                        "min_rows":                  {"type": "integer"},
                        "max_rows":                  {"type": "integer"},
                    },
                    "required": ["ref", "page_ref", "category_ref", "trigger_builder_field_ref", "label"],
                },
            },
            "addmore_columns": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "group_ref":         {"type": "string"},
                        "builder_field_ref": {"type": "string"},
                        "col_order":         {"type": "integer"},
                    },
                    "required": ["group_ref", "builder_field_ref", "col_order"],
                },
            },
            "form_rules": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "scope": {
                            "type": "string",
                            "enum": ["field", "page", "form"],
                        },
                        "when_json": {
                            "type": "object",
                            "properties": {
                                "field_ref":  {"type": "string"},
                                "operator":   {"type": "string"},
                                "value":      {"type": "string"},
                            },
                            "required": ["field_ref", "operator", "value"],
                        },
                        "then_json": {
                            "type": "object",
                            "properties": {
                                "action":      {"type": "string"},
                                "target_refs": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["action", "target_refs"],
                        },
                    },
                    "required": ["scope", "when_json", "then_json"],
                },
            },
        },
        "required": ["meta", "categories", "form_fields", "page_masters",
                     "page_category_mappings", "builder_fields",
                     "field_options", "addmore_groups", "addmore_columns", "form_rules"],
    }


def _extract_options_from_srs(srs_text: str, file_bytes: bytes = None, filename: str = None) -> str:
    """
    Pass 1 (Gemini, NO response_schema): extract field-name → options mapping from SRS.
    Returns a plain text summary that gets injected into the main generation prompt.
    Example output:
      Type Of Proposal: New Project | Diversification | Modernization | Expansion | Closure
      Primary Activity Of Project: Manufacturing | Service
      Constitution Of Establishment: LLP | Private Limited | Society | Public Limited | Trust
    """
    try:
        import google.generativeai as genai
        import tempfile
    except ImportError:
        return ""

    if not GEMINI_API_KEY:
        return ""

    genai.configure(api_key=GEMINI_API_KEY)

    extraction_prompt = (
        "Read the SRS document carefully. "
        "Find every dropdown, select box, radio button, and multi-select field. "
        "For each one, list the field name and all its available options. "
        "Output ONLY a plain text list, one field per line, in this exact format:\n"
        "  Field Name: Option A | Option B | Option C\n\n"
        "Do NOT include text, number, date, file, or textarea fields. "
        "Do NOT add any explanation or headings. Just the field-options list."
    )

    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    try:
        if file_bytes and filename:
            ext = filename.rsplit(".", 1)[-1].lower()
            mime = {
                "pdf": "application/pdf",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "txt": "text/plain",
            }.get(ext, "application/octet-stream")
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                import os as _os
                uploaded = genai.upload_file(path=tmp_path, display_name=filename, mime_type=mime)
                resp = model.generate_content(
                    [uploaded, extraction_prompt],
                    generation_config={"temperature": 0.0, "max_output_tokens": 8192},
                )
                try:
                    genai.delete_file(uploaded.name)
                except Exception:
                    pass
                return resp.text or ""
            finally:
                _os.unlink(tmp_path)
        else:
            resp = model.generate_content(
                f"{extraction_prompt}\n\nSRS TEXT:\n{srs_text[:40000]}",
                generation_config={"temperature": 0.0, "max_output_tokens": 8192},
            )
            return resp.text or ""
    except Exception:
        return ""


def _call_gemini(system_prompt: str, user_message: str) -> str:
    """Gemini API call using extracted SRS text."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai not installed. Run: pip install google-generativeai")

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt
    )
    response = model.generate_content(
        user_message,
        generation_config={
            "temperature": 0.0,
            "response_mime_type": "application/json",
            "max_output_tokens": 65536,
            # NOTE: response_schema removed intentionally.
            # With response_schema, Gemini shortcuts to empty arrays [] when it
            # runs low on tokens (to satisfy schema "required" fields). This causes
            # page_masters, builder_fields etc. to be empty even though categories
            # were generated. Without schema, it generates as much as possible.
        },
    )
    return response.text


def _call_gemini_with_file( system_prompt: str, user_message: str, file_bytes: bytes, filename: str
) -> str:
    """
    Gemini File API — upload PDF/DOCX directly to Gemini (no text extraction).
    Handles large SRS files (up to 2GB) without truncation.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai not installed.")

    import tempfile, os, mimetypes

    genai.configure(api_key=GEMINI_API_KEY)

    # Write bytes to temp file for upload
    ext = filename.rsplit(".", 1)[-1].lower()
    mime = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "txt": "text/plain"}.get(ext, "application/octet-stream")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        uploaded = genai.upload_file(path=tmp_path, display_name=filename, mime_type=mime)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            [uploaded, user_message],
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": 65536,
                "response_mime_type": "application/json",
                # NOTE: response_schema removed — see _call_gemini for explanation.
            },
        )

        print(response.text)
        # Clean up uploaded file from Gemini
        try:
            genai.delete_file(uploaded.name)
        except Exception:
            pass
        return response.text
    finally:
        os.unlink(tmp_path)

def _call_gemini_workflow_with_file(system_prompt: str, user_message: str, file_bytes: bytes, filename: str) -> str:
    """
    Gemini File API for Agent 3 (workflow). Uses GEMINI_API_KEY3.
    No form schema constraint — free JSON output for workflow structure.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai not installed.")

    import tempfile, os, mimetypes

    key = GEMINI_API_KEY3 or GEMINI_API_KEY2 or GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY3 not set in .env")

    genai.configure(api_key=key)

    ext  = filename.rsplit(".", 1)[-1].lower()
    mime = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "txt": "text/plain"}.get(ext, "application/octet-stream")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        uploaded = genai.upload_file(path=tmp_path, display_name=filename, mime_type=mime)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            [uploaded, user_message],
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": 65536,
                "response_mime_type": "application/json",
            },
        )
        try:
            genai.delete_file(uploaded.name)
        except Exception:
            pass
        return response.text
    finally:
        os.unlink(tmp_path)

def _complete_builder_fields(data: dict, file_bytes: bytes = None, filename: str = None) -> dict:
    """
    Continuation pass: fills missing page_masters, page_category_mappings, and builder_fields
    when the main generation was truncated (hit max output tokens).
    Handles both partial truncation (some builder_fields missing) and full truncation
    (page_masters + page_category_mappings + all builder_fields missing).
    """
    try:
        import google.generativeai as genai
    except ImportError:
        return data

    if not GEMINI_API_KEY:
        return data

    form_fields    = data.get("form_fields", [])
    builder_fields = data.get("builder_fields", [])
    page_masters   = data.get("page_masters", [])
    pcms           = data.get("page_category_mappings", [])
    categories     = data.get("categories", [])

    need_pages    = len(page_masters) == 0
    covered       = {bf.get("field_ref") for bf in builder_fields}
    missing_ffs   = [ff for ff in form_fields if ff.get("ref") not in covered]
    need_bfs      = len(missing_ffs) > 0

    if not need_pages and not need_bfs:
        return data  # nothing to fix

    print(f"[continuation] need_pages={need_pages}, missing_bfs={len(missing_ffs)}")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    def _gemini_call(prompt: str, max_tokens: int = 16384) -> str:
        """Call Gemini, optionally with uploaded file."""
        if file_bytes and filename:
            import tempfile, os as _os
            ext  = filename.rsplit(".", 1)[-1].lower()
            mime = {"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}.get(ext, "application/octet-stream")
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            try:
                uploaded = genai.upload_file(path=tmp_path, display_name=filename, mime_type=mime)
                resp = model.generate_content(
                    [uploaded, prompt],
                    generation_config={"temperature": 0.0, "max_output_tokens": max_tokens, "response_mime_type": "application/json"},
                )
                try:
                    genai.delete_file(uploaded.name)
                except Exception:
                    pass
                return resp.text or "{}"
            finally:
                _os.unlink(tmp_path)
        else:
            resp = model.generate_content(
                prompt,
                generation_config={"temperature": 0.0, "max_output_tokens": max_tokens, "response_mime_type": "application/json"},
            )
            return resp.text or "{}"

    # ── Pass A: Generate page_masters + page_category_mappings if missing ──────
    if need_pages:
        cats_json = json.dumps(categories, ensure_ascii=False)
        ffs_json  = json.dumps(form_fields[:20], ensure_ascii=False)  # sample for context

        page_prompt = f"""You are completing a truncated form builder JSON.
The main generation ran out of tokens before generating page_masters and page_category_mappings.

CATEGORIES that exist (all 18 need pages):
{cats_json}

SAMPLE FORM FIELDS (first 20, for context):
{ffs_json}

YOUR JOB: Generate page_masters and page_category_mappings for a government form based on these categories.

RULES:
1. Return ONLY a JSON object with exactly 2 keys: "page_masters" and "page_category_mappings".
2. page_masters: array of pages. Each page:
   {{"ref": "$P1", "page_name": "Page Name", "name_in_hindi": null, "preference": 1}}
3. page_category_mappings: array mapping every category to a page. Each entry:
   {{"page_ref": "$P1", "category_ref": "$C1", "preference": 1, "help_text": null}}
4. EVERY category_ref in the categories list MUST have exactly one page_category_mappings entry.
5. Group related categories on the same page (e.g. company info → Page 1, promoter details → Page 2).
6. Use $P1, $P2, ... for page refs.
7. Return ONLY valid JSON — no explanation, no markdown."""

        try:
            raw = _clean_json_response(_gemini_call(page_prompt, max_tokens=8192))
            page_data = json.loads(raw)
            if isinstance(page_data.get("page_masters"), list) and page_data["page_masters"]:
                data["page_masters"] = page_data["page_masters"]
                data["page_category_mappings"] = page_data.get("page_category_mappings", [])
                print(f"[continuation] Generated {len(data['page_masters'])} page_masters, {len(data['page_category_mappings'])} pcm entries")
                # Refresh local vars
                page_masters = data["page_masters"]
                pcms         = data["page_category_mappings"]
        except Exception as e:
            print(f"[continuation] Failed to generate page structure: {e}")

    # ── Pass B: Generate missing builder_fields in batches of 35 ─────────────
    # 115 fields × ~300 tokens each ≈ 34 500 tokens — exceeds one call limit.
    # Batching ensures each call stays well within 32K output tokens.
    BATCH_SIZE = 35
    if missing_ffs:
        cats_map   = {c["ref"]: c.get("category_name", "") for c in categories}
        pcm_map    = {m["category_ref"]: m["page_ref"] for m in pcms}
        sample_bfs = builder_fields[-3:] if len(builder_fields) >= 3 else builder_fields

        # Track preferences and next BF number across batches
        pref_counter: dict = {}
        for bf in data.get("builder_fields", []):
            cr = bf.get("category_ref", "")
            pref_counter[cr] = max(pref_counter.get(cr, 0), bf.get("preference", 0) or 0)

        existing_bf_nums = []
        for bf in data.get("builder_fields", []):
            digits = "".join(c for c in bf.get("ref", "").replace("$BF", "") if c.isdigit())
            if digits:
                existing_bf_nums.append(int(digits))
        next_bf_num = (max(existing_bf_nums) + 1) if existing_bf_nums else 1

        context_header = (
            f"Category ref → name: {json.dumps(cats_map, ensure_ascii=False)}\n"
            f"Category ref → page ref: {json.dumps(pcm_map, ensure_ascii=False)}\n"
        )
        style_ref = (
            f"Style reference (match this structure exactly):\n{json.dumps(sample_bfs, ensure_ascii=False)}\n"
            if sample_bfs else ""
        )
        rules = """RULES:
1. Return ONLY a JSON array — no wrapper, no explanation, no markdown.
2. Every object MUST have ALL 19 keys: ref, page_ref, category_ref, field_ref, preference,
   input_type, custom_label, placeholder, help_text, grid_span, is_required, is_readonly,
   is_editable, is_active, min_length, max_length, pattern, validation_rule, layout_type
3. page_ref: derive from category_ref using the mapping above.
4. preference: increment from the "current highest per category_ref" value shown for each batch.
5. is_required / is_readonly / is_editable / is_active: "Y" or "N" strings only.
6. min_length / max_length: null unless obvious from field type — NEVER 0.
7. placeholder / help_text / pattern / layout_type / validation_rule: null when not applicable.
8. input_type: infer from field name — text, number, select, date, radio, checkbox, textarea,
   file, tel, email, hidden, multiselect, datetime-local, button.
9. grid_span: 12 for textarea/address, 3 for buttons, 6 for all others."""

        total_batches = (len(missing_ffs) + BATCH_SIZE - 1) // BATCH_SIZE
        for b_idx in range(total_batches):
            batch = missing_ffs[b_idx * BATCH_SIZE : (b_idx + 1) * BATCH_SIZE]
            bf_prompt = (
                f"You are completing a truncated form builder JSON.\n"
                f"Batch {b_idx + 1}/{total_batches}: generate builder_fields for {len(batch)} form_fields.\n\n"
                f"FORM_FIELDS FOR THIS BATCH:\n{json.dumps(batch, ensure_ascii=False)}\n\n"
                f"CONTEXT:\n{context_header}"
                f"Current highest preference per category_ref: {json.dumps(pref_counter, ensure_ascii=False)}\n"
                f"Start $BF refs from $BF{next_bf_num}.\n"
                f"{style_ref}\n{rules}"
            )
            try:
                # Use text-only call for Pass B — SRS file not needed, avoids upload overhead
                resp = model.generate_content(
                    bf_prompt,
                    generation_config={"temperature": 0.0, "max_output_tokens": 16384, "response_mime_type": "application/json"},
                )
                raw     = _clean_json_response(resp.text or "[]")
                new_bfs = json.loads(raw)
                if isinstance(new_bfs, list) and new_bfs:
                    data["builder_fields"].extend(new_bfs)
                    # Update pref_counter and next_bf_num for next batch
                    for bf in new_bfs:
                        cr = bf.get("category_ref", "")
                        pref_counter[cr] = max(pref_counter.get(cr, 0), bf.get("preference", 0) or 0)
                        digits = "".join(c for c in bf.get("ref", "").replace("$BF", "") if c.isdigit())
                        if digits:
                            next_bf_num = max(next_bf_num, int(digits) + 1)
                    print(f"[continuation] Batch {b_idx+1}/{total_batches}: added {len(new_bfs)} BFs. Total: {len(data['builder_fields'])}")
                else:
                    print(f"[continuation] Batch {b_idx+1}/{total_batches}: empty response — skipped")
            except Exception as e:
                print(f"[continuation] Batch {b_idx+1}/{total_batches} failed: {e}")

    return data


def _call_gemini_documents(system_prompt: str, user_message: str) -> str:
    
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai not installed.")

    key = GEMINI_API_KEY2 or GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY2 (or GEMINI_API_KEY) not set in .env")

    genai.configure(api_key=key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt,
    )

    response = model.generate_content(
        user_message,
        generation_config={
            "temperature": 0.0,
            "response_mime_type": "application/json",
            "max_output_tokens":65323
        },
    )

    return response.text



def _call_gemini_workflow(system_prompt: str, user_message: str) -> str:
    """Gemini call for Agent 3 — workflow config. Uses GEMINI_API_KEY3."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("google-generativeai not installed.")

    key = GEMINI_API_KEY3 or GEMINI_API_KEY2 or GEMINI_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY3 (or fallback KEY2/KEY1) not set in .env")

    genai.configure(api_key=key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt,
    )

    response = model.generate_content(
        user_message,
        generation_config={
            "temperature": 0.0,
            "response_mime_type": "application/json",
            "max_output_tokens": 65536,
        },
    )

    return response.text


def srs_text_to_json(
    srs_text: str,
    department_id: int,
    service_id: str,
    form_type_id: int,
    existing_categories: list,
    existing_fields: list,
    existing_masters:list,
    file_bytes: bytes = None,
    filename: str = None,
) -> dict:
    """
    Send SRS text to Ollama/OpenWebUI (qwen2.5-coder) → DB-ready JSON.

    Args:
        srs_text: Extracted text from PDF/DOCX/TXT
        department_id: Department ID from swcs DB
        service_id: Service ID string e.g. "1.0"
        form_type_id: Form type ID from m_fb_form_types
        existing_categories: [{id, category_name, category_code}]
        existing_fields: [{id, name, formchk_id}]
        existing_masters: [{id, master_name, master_code,description}]
    """
    system_prompt = load_system_prompt()

    # Build context about existing DB data so AI can reuse them
    existing_context = ""
    if existing_categories:
        cats = "\n".join(
            f"  id={c['id']}: {c['category_name']} (code: {c['category_code']})"
            for c in existing_categories
        )
        existing_context += f"\n\nEXISTING CATEGORIES IN DB (reuse with USE_EXISTING if matching):\n{cats}"

    if existing_fields:
        fields = "\n".join(
            f"  id={f['id']}: {f['name']} (formchk_id: {f['formchk_id']})"
            for f in existing_fields
        )
        existing_context += f"\n\nEXISTING FORM FIELDS IN DB (reuse with USE_EXISTING if matching):\n{fields}"

    if existing_masters:
        masters = "\n".join(
            f"  id={f['id']}: {f['master_name']} (master_code: {f['master_code']}) (description: {f['description']})"
            for f in existing_masters
        )

        existing_context += (
            f"\n\nEXISTING Masters IN DB (reuse with USE_EXISTING if matching):\n{masters}"
        )

    print(existing_context)

    user_message = f"""Convert the following SRS document into the DB-ready JSON format.
    STRICT RULE: Return the valid json for all the fields mention in the SRS
    CONTEXT:
    - department_id: {department_id}
    - service_id: "{service_id}"
    - form_type_id: {form_type_id}
    - Existing Matsers: {existing_context}


    SRS DOCUMENT TEXT:
    ---
    {srs_text}
---

CRITICAL REMINDERS:
- static_options: NEVER use placeholder options like "Option 1" / "option_1".
  For EVERY select/radio/multiselect/checkbox field, READ the SRS document and extract the ACTUAL options listed there.
  Options in SRS are typically pipe-separated: e.g. "New Project | Diversification | Modernization | Expansion | Closure"
  Convert each to: {{"label": "New Project", "value": "new_project"}} (value = lowercase_snake_case of label).
  If you cannot find specific options in the SRS, use source_type="MASTER" instead of inventing placeholder options.
- form_rules: Include an entry for EVERY conditional/show/hide rule found in the SRS.
  Format: {{ "scope": "field", "when_json": {{"field_ref":"$BFx","operator":"equals","value":"v"}}, "then_json": {{"action":"show","target_refs":["$BFy"]}} }}
  Only use form_rules: [] if the SRS truly has zero conditional rules.
- addmore_groups: If the SRS has ANY repeatable/add-more table section, you MUST populate addmore_groups and addmore_columns.
  addmore_groups format: {{ "ref": "$AG1", "page_ref": "$Px", "category_ref": "$Cx", "trigger_builder_field_ref": "$BFy", "label": "Section label", "min_rows": 1, "max_rows": 10 }}
  addmore_columns format: {{ "group_ref": "$AG1", "builder_field_ref": "$BFz", "col_order": 1 }}
  Only use addmore_groups: [] if the SRS has NO repeatable sections at all.

Return ONLY the valid JSON object. No explanation, no markdown, no code fences."""

    if AI_MODE == "mock":
        mock_path = Path(__file__).parent / "mock_data" / "form_json.json"
        return json.loads(mock_path.read_text(encoding="utf-8"))

    if AI_MODE == "gemini":
        # ── Pass 1: Extract real field options from SRS (no schema constraint) ──
        # This runs BEFORE the main generation so Gemini doesn't invent placeholders.
        extracted_options = _extract_options_from_srs(
            srs_text=srs_text,
            file_bytes=file_bytes,
            filename=filename,
        )
        if extracted_options.strip():
            user_message = user_message.replace(
                "CRITICAL REMINDERS:",
                f"FIELD OPTIONS EXTRACTED FROM SRS DOCUMENT (use these EXACTLY for static_options):\n"
                f"--- OPTIONS MAP ---\n{extracted_options.strip()}\n---\n\n"
                f"For each field above, convert each option to {{\"label\": \"Option Name\", \"value\": \"option_name\"}} "
                f"(value = lowercase_snake_case). Use ONLY these options in static_options — do NOT invent any others.\n\n"
                f"CRITICAL REMINDERS:",
            )

        # ── Pass 2: Main JSON generation (with schema constraint) ──
        # Use File API when PDF is provided (bypasses text extraction entirely)
        if file_bytes and filename:
            raw_text = _call_gemini_with_file(system_prompt, user_message, file_bytes, filename)
            # print(raw_text)
        else:
            raw_text = _call_gemini(system_prompt, user_message)
    elif AI_MODE == "openwebui":
        raw_text = _call_openwebui(system_prompt, user_message)
    else:
        raw_text = _call_ollama(system_prompt, user_message)

    cleaned = _clean_json_response(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Model returned invalid JSON.\n"
            f"Error: {e}\n"
            f"Raw response:\n{cleaned}"
        )

    # ── Continuation pass: fill any missing builder_fields ──────────────────
    if AI_MODE == "gemini":
        ff_count = len(parsed.get("form_fields", []))
        bf_count = len(parsed.get("builder_fields", []))
        if bf_count < ff_count:
            print(f"[continuation] builder_fields({bf_count}) < form_fields({ff_count}) — running continuation pass...")
            parsed = _complete_builder_fields(parsed, file_bytes=file_bytes, filename=filename)

    return parsed



def srs_to_document_checklist_json(
    srs_text: str,
    service_id: str,
    field_data:list,
    document_master:list,
    document_types:list,
    file_bytes: bytes = None,
    filename: str = None
) -> dict:

    system_prompt = load_document_system_prompt()

    user_message = f"""
    Extract document checklist requirements from the SRS and generate JSON strictly using the provided schema.

    STRICT RULES:
    1. Use ONLY the information present in the SRS TEXT.
    2. Do NOT invent documents.
    3. Do NOT Give the documents which are not present in SRS and dont take all types from Documentt types ,take only relavent types and map it accordingly
    4. Use DOCUMENT_MASTER to map document names to document_master_id.
    5. Use DOCUMENT TYPES only for category mapping.
    6. Every checklist must contain a valid document_master_id if document mentioned in SRS is not present in Document Master use <UK-DCL-XXXX> in id.
    7. Do Not Hallucinate the Document Master ID , Give the Acutual id if present , if not Give the id in <UK-DCL-XXXX>
    8. DO not invent new Names for Documents , As per the Document Name Given map it to relavent document type
    SERVICE ID:
    {service_id}

    SRS TEXT:
    ---
    {srs_text}
    ---

    FIELD DATA (FORM FIELDS THAT MAY CONTROL DOCUMENT CONDITIONS):
    {field_data}

    DOCUMENT TYPES (CATEGORY MAPPING):
    {document_types}

    DOCUMENT MASTER (DOCUMENT NAME TO ID MAPPING):
    {document_master}

    --------------------------------
    DOCUMENT EXTRACTION RULES
    --------------------------------

    The SRS may define document uploads inside tables.

    If a table contains columns similar to:

    Field Name | Type | Mandatory | Validation

    Then apply the following rules:

    1. Only process rows where:
    Type = "File Upload"

    2. Map values as follows:

    Field Name → name  
    Mandatory → isRequired  
    Validation.accept → allowedFormats  
    Validation.maxSizeMB → maxSizeMb  

    3. isRequired mapping:

    Mandatory → true  
    Conditional → false  
    Optional → false  

    4. allowedFormats rules:

    Extract extensions from Validation.accept.

    Example:

    Validation.accept = ".pdf,.jpg,.jpeg,.png"

    Convert to:

    ["pdf","jpg","jpeg","png"]

    Remove the dot from extensions.

    5. maxSizeMb rules:

    If Validation.maxSizeMB exists → use that value.

    Otherwise use default:

    5242880

    --------------------------------
    CHECKLIST OBJECT STRUCTURE
    --------------------------------

    Each checklist must follow this structure exactly:

    {{
        "id": <document_master_id>,
        "meta": {{
            "comment": "",
            "extraFields": {{}},
            "serviceStatus": "ONBOARDED"
        }},
        "name": "<document name>",
        "maxSizeMb": 5242880,
        "isRequired": false,
        "checkpoints": [],
        "allowedFormats": ["pdf"],
        "prescribedFormat": null
    }}

    --------------------------------
    EXAMPLE TABLE ROW
    --------------------------------

    Field Name: Company PAN Card  
    Type: File Upload  
    Mandatory: Mandatory  
    Validation: {{"accept": ".pdf,.jpg,.jpeg,.png", "maxSizeMB": 5}}

    --------------------------------
    EXPECTED JSON OUTPUT
    --------------------------------

    {{
    "name": "Company PAN Card",
    "isRequired": true,
    "allowedFormats": ["pdf","jpg","jpeg","png"],
    "maxSizeMb": 5242880
    }}

    --------------------------------
    FINAL RULES
    --------------------------------

    1. Do NOT skip any File Upload rows.
    2. Each File Upload must become a checklist item.
    3. Do NOT generate empty documentTypes.
    4. Do NOT generate placeholder document names.
    5. Use document_master_id from DOCUMENT_MASTER for checklist id.

    --------------------------------

    Return ONLY valid JSON.
    Do NOT include explanations, markdown, or comments.
    """

    if AI_MODE == "mock":
        mock_path = Path(__file__).parent / "mock_data" / "document_json.json"
        return json.loads(mock_path.read_text(encoding="utf-8"))

    if AI_MODE == "gemini":

        if file_bytes and filename:
            raw_text = _call_gemini_with_file(
                system_prompt,
                user_message,
                file_bytes,
                filename
            )
        else:
            raw_text = _call_gemini_documents(
                system_prompt,
                user_message
            )

    elif AI_MODE == "openwebui":
        raw_text = _call_openwebui(system_prompt, user_message)

    else:
        raw_text = _call_ollama(system_prompt, user_message)

    cleaned = _clean_json_response(raw_text)

    print(cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Model returned invalid JSON.\n"
            f"Error: {e}\n"
            f"Raw response:\n{cleaned}"
        )



def srs_to_workflow_json(
    srs_text: str,
    department_id: int,
    service_id: str,
    roles: list[dict],
    form_types: list[dict],
    file_bytes: bytes = None,
    filename: str = None,
) -> dict:
    """
    Agent 3 — Read SRS and generate workflow configuration JSON
    for c_application_workflow_configuration table + officer forms for m_fb_* tables.

    Args:
        srs_text:     Extracted text from PDF/DOCX/TXT
        department_id: Department ID
        service_id:   Service ID string
        roles:        List of {id, name} from roles table (DB context)
        form_types:   List of {id, type_name} from m_fb_form_types (DB context)
        file_bytes:   Raw PDF bytes (if uploaded directly)
        filename:     Original filename

    Returns:
        Parsed JSON dict with meta + workflow_steps + officer_forms
    """
    prompt_path = Path(__file__).parent / "prompts" / "workflow_prompt.txt"
    system_prompt = prompt_path.read_text(encoding="utf-8") if prompt_path.exists() else ""

    roles_context      = "\n".join(f"  id={r['id']}: {r['name']}" for r in roles)
    form_types_context = "\n".join(f"  id={ft['id']}: {ft['type_name']}" for ft in form_types)

    user_message = f"""Read the SRS document and generate the workflow configuration JSON including officer forms.

CONTEXT:
- department_id: {department_id}
- service_id: "{service_id}"

ROLES LIST (use these exact IDs for role_id, current_role_id, next_role_id, etc.):
{roles_context}

FORM TYPES LIST (use these exact IDs for form_type_id in workflow_steps and officer_forms):
{form_types_context}

SRS DOCUMENT:
---
{srs_text}
---

Return ONLY valid JSON. No markdown, no explanation."""

    if AI_MODE == "gemini":
        if file_bytes and filename:
            raw_text = _call_gemini_workflow_with_file(system_prompt, user_message, file_bytes, filename)
        else:
            raw_text = _call_gemini_workflow(system_prompt, user_message)
    elif AI_MODE == "openwebui":
        raw_text = _call_openwebui(system_prompt, user_message)
    elif AI_MODE == "mock":
        mock_path = Path(__file__).parent / "mock_data" / "workflow_mock.dat"
        return json.loads(mock_path.read_text(encoding="utf-8"))
    else:
        raise RuntimeError(f"AI_MODE '{AI_MODE}' not supported for workflow generation")

    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"```\s*$", "", cleaned.strip(), flags=re.MULTILINE).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # JSON truncated (output token limit) — salvage workflow_steps at minimum
        # Find the last complete workflow_steps array
        steps_match = re.search(r'"workflow_steps"\s*:\s*(\[.*?\])\s*[,}]', cleaned, re.DOTALL)
        meta_match  = re.search(r'"meta"\s*:\s*(\{.*?\})\s*,', cleaned, re.DOTALL)
        if steps_match:
            try:
                steps = json.loads(steps_match.group(1))
                meta  = json.loads(meta_match.group(1)) if meta_match else {}
                print("[Agent 3] JSON truncated — salvaged workflow_steps only, officer_forms dropped")
                return {
                    "meta":           meta,
                    "workflow_steps": steps,
                    "officer_forms":  [],
                    "_truncated":     True,
                }
            except Exception:
                pass
        raise ValueError(
            f"Workflow agent returned invalid JSON (output truncated).\n"
            f"Tip: Reduce officer_forms complexity or check max_output_tokens.\n"
            f"Raw (first 500 chars):\n{cleaned[:500]}"
        )


def check_ollama_connection() -> dict:
    """Check if Ollama/OpenWebUI is reachable and model is available."""
    host  = os.getenv("OPENWEBUI_HOST" if AI_MODE == "openwebui" else "OLLAMA_HOST", "")
    model = os.getenv("OLLAMA_MODEL", "")
    if AI_MODE == "openwebui":
        try:
            resp = requests.get(f"{host}/api/models", timeout=10)
            resp.raise_for_status()
            models = [m.get("id", "") for m in resp.json().get("data", [])]
            return {
                "connected": True,
                "mode": "openwebui",
                "host": host,
                "model": model,
                "model_available": any(model in m for m in models),
                "available_models": models,
            }
        except Exception as e:
            return {"connected": False, "mode": "openwebui", "host": host, "error": str(e)}
    else:
        try:
            resp = requests.get(f"{host}/api/tags", timeout=10)
            resp.raise_for_status()
            models = [m["name"] for m in resp.json().get("models", [])]
            return {
                "connected": True,
                "mode": "ollama",
                "host": host,
                "model": model,
                "model_available": any(model in m for m in models),
                "available_models": models,
            }
        except Exception as e:
            return {"connected": False, "mode": "ollama", "host": host, "error": str(e)}
