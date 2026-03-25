"""
DB Insert Engine for swcs_form_builder.
Inserts AI-generated JSON into m_fb_* tables in correct order.
Uses exact column names from Prisma schema.

Key differences from PoC:
- is_active = 'Y'/'N' (YnFlag) for most tables
- FormCategory/FormField use Boolean is_active (true/false)
- FormField active column = is_formvar_active
- grid_span (not col_span), preference (not sort_order)
- field_options stored as JSON in static_options column
- form_rules use when_json / then_json
"""
import json
from db import get_connection, get_cursor


# ── Code Generators ──────────────────────────────────────────────────────────

def next_category_code(cur) -> str:
    """UK-CAT-NNN_0 (3-digit padded, based on current MAX id)"""
    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next FROM m_fb_form_categories")
    n = cur.fetchone()["next"]
    return f"UK-CAT-{str(n).zfill(3)}_0"


def next_formchk_id(cur) -> str:
    """UK-FCL-NNNNN_0 (5-digit padded, based on current MAX id)"""
    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next FROM m_fb_form_field")
    n = cur.fetchone()["next"]
    return f"UK-FCL-{str(n).zfill(5)}_0"


def generate_form_code(service_id: str, mapping_id: int, form_type_id: int) -> str:
    """UK-SR-{int}_{dec2}-FRM-{mapping_id}_{type_pad2}"""
    parts = service_id.split(".")
    int_p = parts[0]
    dec_p = str(parts[1]).zfill(2) if len(parts) > 1 else "00"
    return f"UK-SR-{int_p}_{dec_p}-FRM-{mapping_id}_{str(form_type_id).zfill(2)}"


def generate_page_code(service_id: str, page_seq: int) -> str:
    """UK-SR-{int}_{dec2}-FRM-{page_seq_pad2}"""
    parts = service_id.split(".")
    int_p = parts[0]
    dec_p = str(parts[1]).zfill(2) if len(parts) > 1 else "00"
    return f"UK-SR-{int_p}_{dec_p}-FRM-{str(page_seq).zfill(2)}"


# ── Ref Resolver ─────────────────────────────────────────────────────────────

def resolve(value, maps: dict):
    """
    Replace __REF__map_name[$KEY] with actual integer from runtime maps.
    e.g. "__REF__page_id_map[$P1]" → 42
    """
    if not isinstance(value, str) or "__REF__" not in value:
        return value
    key = value.replace("__REF__", "")  # "page_id_map[$P1]"
    map_name, label = key.split("[", 1)
    label = label.rstrip("]")
    return maps[map_name][label]


def resolve_ref(ref_str: str, maps: dict):
    """Resolve a plain ref like '$P1' from a named map."""
    return maps.get(ref_str)


# ── Main Insert Function ──────────────────────────────────────────────────────

def insert_form(payload: dict, form_version: str = "v1") -> dict:
    """
    Insert form data into swcs_form_builder m_fb_* tables.

    Steps:
    1. Categories
    2. Form Fields
    3. Form Mapping
    4. Page Masters
    5. Page-Category Mappings
    6. Builder Fields
    7. Field Options (static_options JSON)
    8. Add-More Groups
    9. Add-More Columns
    10. Form Rules

    Returns summary dict with all inserted IDs.
    """
    conn = get_connection()
    cur  = get_cursor(conn)

    meta        = payload["meta"]
    department_id = meta["department_id"]
    service_id    = meta["service_id"]
    form_type_id  = meta["form_type_id"]
    form_name     = meta["form_name"]

    # Runtime ID maps
    maps = {
        "cat_id_map":           {},   # $C1 → db id
        "field_id_map":         {},   # $F1 → db id
        "field_code_map":       {},   # $F1 → formchk_id string
        "form_mapping_id":      {},   # $FM1 → db id (always $FM1)
        "page_id_map":          {},   # $P1 → db id
        "builder_field_id_map": {},   # $BF1 → db id
        "addmore_group_id_map": {},   # $AG1 → db id
    }

    try:
        # ── STEP 1: Categories ──────────────────────────────────────────────
        for cat in payload.get("categories", []):
            ref = cat["ref"]
            if cat["action"] == "USE_EXISTING":
                maps["cat_id_map"][ref] = cat["existing_id"]
            else:
                code = next_category_code(cur)
                raw_parent = cat.get("parent_id", 0)
                if isinstance(raw_parent, str) and raw_parent.startswith("$"):
                    parent_id = maps["cat_id_map"].get(raw_parent, 0)
                elif isinstance(raw_parent, str):
                    parent_id = 0
                else:
                    parent_id = raw_parent or 0
                cur.execute(
                    """INSERT INTO m_fb_form_categories
                       (category_name, name_in_hindi, category_code, parent_id, is_active,
                        "createdAt", "updatedAt")
                       VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                       RETURNING id""",
                    (
                        cat["category_name"],
                        cat.get("name_in_hindi"),
                        code,
                        parent_id,
                        cat.get("is_active", True),
                    )
                )
                maps["cat_id_map"][ref] = cur.fetchone()["id"]

        # ── STEP 2: Form Fields ─────────────────────────────────────────────
        # Normalise action value — AI may generate INSERT_NEW / NEW / CREATE / USE_EXISTING
        _CREATE_ACTIONS = {"CREATE", "INSERT_NEW", "NEW", "INSERT"}

        for ff in payload.get("form_fields", []):
            ref    = ff["ref"]
            action = str(ff.get("action", "")).upper().replace(" ", "_")

            if action == "USE_EXISTING":
                existing_id = ff.get("existing_id")
                if existing_id:
                    cur.execute("SELECT id, formchk_id FROM m_fb_form_field WHERE id = %s", (existing_id,))
                    row = cur.fetchone()
                    if row:
                        maps["field_id_map"][ref]   = row["id"]
                        maps["field_code_map"][ref] = row["formchk_id"] or ""
                        continue          # resolved — skip CREATE block
                # ID missing or not found in DB — fall through to CREATE
                action = "CREATE"

            if action in _CREATE_ACTIONS:
                code       = next_formchk_id(cur)
                cat_ref    = ff.get("category_ref")
                cat_id     = maps["cat_id_map"].get(cat_ref) if cat_ref else None
                raw_fp = ff.get("parent_id", 0)
                field_parent_id = 0 if (not raw_fp or isinstance(raw_fp, str)) else raw_fp
                cur.execute(
                    """INSERT INTO m_fb_form_field
                       (formchk_id, parent_id, category_id, name, name_in_hindi,
                        is_editable, is_formvar_active, "createdAt", "updatedAt")
                       VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                       RETURNING id""",
                    (
                        code,
                        field_parent_id,
                        cat_id,
                        ff["name"],
                        ff.get("name_in_hindi"),
                        ff.get("is_editable", "Y"),
                        ff.get("is_active", True),
                    )
                )
                new_id = cur.fetchone()["id"]
                maps["field_id_map"][ref]   = new_id
                maps["field_code_map"][ref] = code

        # ── STEP 3: Form Mapping ────────────────────────────────────────────
        cur.execute(
            """INSERT INTO m_fb_form_mapping
               (department_id, service_id, form_type_id, form_name, form_code, form_version, is_active)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id""",
            (department_id, service_id, form_type_id, form_name,
             "__TEMP__", form_version, "Y")
        )
        mapping_id = cur.fetchone()["id"]
        form_code  = generate_form_code(service_id, mapping_id, form_type_id)
        cur.execute("UPDATE m_fb_form_mapping SET form_code = %s WHERE id = %s",
                    (form_code, mapping_id))
        maps["form_mapping_id"]["$FM1"] = mapping_id

        # ── STEP 4: Page Masters ────────────────────────────────────────────
        for seq, pg in enumerate(payload.get("page_masters", []), 1):
            ref       = pg["ref"]
            page_code = generate_page_code(service_id, seq)
            cur.execute(
                """INSERT INTO m_fb_page_master
                   (service_id, page_name, name_in_hindi, preference, form_id, form_code, is_active)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    service_id,
                    pg["page_name"],
                    pg.get("name_in_hindi"),
                    pg.get("preference", seq),
                    form_type_id,   # NestJS queries pages by form_type_id, not mapping_id
                    page_code,
                    "Y",
                )
            )
            maps["page_id_map"][ref] = cur.fetchone()["id"]

        # ── STEP 5: Page-Category Mappings ──────────────────────────────────
        for pcm in payload.get("page_category_mappings", []):
            page_id = maps["page_id_map"].get(pcm["page_ref"])
            cat_id  = maps["cat_id_map"].get(pcm["category_ref"])
            cur.execute(
                """INSERT INTO m_fb_page_category_mapping
                   (page_id, category_id, preference, help_text, is_active)
                   VALUES (%s, %s, %s, %s, %s)""",
                (page_id, cat_id, pcm.get("preference", 1), pcm.get("help_text"), "Y")
            )

        # ── STEP 6: Builder Fields ──────────────────────────────────────────
        for bf in payload.get("builder_fields", []):
            ref      = bf["ref"]
            page_id  = maps["page_id_map"].get(bf["page_ref"])
            cat_id   = maps["cat_id_map"].get(bf["category_ref"])
            field_id = maps["field_id_map"].get(bf["field_ref"])

            if field_id is None:
                raise ValueError(
                    f"Builder field '{ref}' references field_ref='{bf['field_ref']}' "
                    f"which was not resolved. Check form_fields section has a matching ref "
                    f"with action USE_EXISTING (valid id) or CREATE."
                )

            val_rule = bf.get("validation_rule")
            if val_rule is not None:
                if isinstance(val_rule, (dict, list)):
                    val_rule = json.dumps(val_rule)
                else:
                    # Plain string from AI — wrap as JSON string or set None
                    try:
                        json.loads(val_rule)   # already valid JSON string?
                    except (json.JSONDecodeError, TypeError):
                        val_rule = None         # discard invalid value

            comp_props = bf.get("component_props")
            if comp_props is not None:
                if isinstance(comp_props, (dict, list)):
                    comp_props = json.dumps(comp_props)
                else:
                    try:
                        json.loads(comp_props)
                    except (json.JSONDecodeError, TypeError):
                        comp_props = None

            cur.execute(
                """INSERT INTO m_fb_form_builder_fields
                   (service_id, form_id, page_id, category_id, form_field_id,
                    preference, input_type, custom_label, placeholder, help_text,
                    grid_span, layout_type, component_props,
                    is_required, is_readonly, is_editable, is_active,
                    min_length, max_length, pattern, validation_rule)
                   VALUES (%s,%s,%s,%s,%s, %s,%s,%s,%s,%s, %s,%s,%s, %s,%s,%s,%s, %s,%s,%s,%s)
                   RETURNING id""",
                (
                    service_id, form_type_id, page_id, cat_id, field_id,  # form_id = form_type_id
                    bf.get("preference", 1),
                    bf.get("input_type", "text"),
                    bf.get("custom_label"),
                    bf.get("placeholder"),
                    bf.get("help_text"),
                    bf.get("grid_span", 6),
                    bf.get("layout_type"),
                    comp_props,
                    bf.get("is_required", "N"),
                    bf.get("is_readonly", "N"),
                    bf.get("is_editable", "Y"),
                    bf.get("is_active", "Y"),
                    bf.get("min_length"),
                    bf.get("max_length"),
                    bf.get("pattern"),
                    val_rule,
                )
            )
            maps["builder_field_id_map"][ref] = cur.fetchone()["id"]

        # ── STEP 7: Field Options ───────────────────────────────────────────
        for opt in payload.get("field_options", []):
            builder_field_id = maps["builder_field_id_map"].get(opt["builder_field_ref"])
            parent_bf_id     = None
            if opt.get("parent_builder_field_ref"):
                parent_bf_id = maps["builder_field_id_map"].get(opt["parent_builder_field_ref"])

            static_opts = opt.get("static_options")
            if static_opts is not None:
                static_opts = json.dumps(static_opts)

            cur.execute(
                """INSERT INTO m_fb_formfield_options
                   (builder_field_id, source_type, static_options,
                    master_table_id, parent_builder_field_id, is_active)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    builder_field_id,
                    opt.get("source_type", "STATIC"),
                    static_opts,
                    opt.get("master_table_id"),
                    parent_bf_id,
                    "Y",
                )
            )

        # ── STEP 8: Add-More Groups ─────────────────────────────────────────
        for ag in payload.get("addmore_groups", []):
            ref      = ag["ref"]
            page_id  = maps["page_id_map"].get(ag["page_ref"])
            cat_id   = maps["cat_id_map"].get(ag["category_ref"])
            trig_id  = maps["builder_field_id_map"].get(ag["trigger_builder_field_ref"])
            cur.execute(
                """INSERT INTO m_fb_addmore_groups
                   (service_id, form_id, page_id, category_id,
                    trigger_builder_field_id, label, min_rows, max_rows, is_active)
                   VALUES (%s,%s,%s,%s, %s,%s,%s,%s,%s)
                   RETURNING id""",
                (
                    service_id, form_type_id, page_id, cat_id,  # form_id = form_type_id
                    trig_id,
                    ag.get("label"),
                    ag.get("min_rows", 1),
                    ag.get("max_rows", 10),
                    "Y",
                )
            )
            maps["addmore_group_id_map"][ref] = cur.fetchone()["id"]

        # ── STEP 9: Add-More Columns ────────────────────────────────────────
        for ac in payload.get("addmore_columns", []):
            group_id = maps["addmore_group_id_map"].get(ac["group_ref"])
            bf_id    = maps["builder_field_id_map"].get(ac["builder_field_ref"])
            cur.execute(
                """INSERT INTO m_fb_addmore_columns
                   (group_id, builder_field_id, col_order)
                   VALUES (%s, %s, %s)""",
                (group_id, bf_id, ac.get("col_order", 1))
            )

        # ── STEP 10: Form Rules ─────────────────────────────────────────────
        for rule in payload.get("form_rules", []):
            when = rule["when_json"]
            then = rule["then_json"]

            # Resolve any field_ref / target_refs inside rule JSONs
            if isinstance(when, dict) and "field_ref" in when:
                ref_key = when["field_ref"]
                bf_id   = maps["builder_field_id_map"].get(ref_key, ref_key)
                when    = {**when, "builder_field_id": bf_id}

            if isinstance(then, dict) and "target_refs" in then:
                target_ids = [
                    maps["builder_field_id_map"].get(r, r)
                    for r in then["target_refs"]
                ]
                then = {**then, "target_builder_field_ids": target_ids}

            cur.execute(
                """INSERT INTO m_fb_form_rules
                   (service_id, form_id, scope, when_json, then_json, is_active)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    service_id, form_type_id,  # form_id = form_type_id
                    rule.get("scope", "field"),
                    json.dumps(when),
                    json.dumps(then),
                    "Y",
                )
            )

        conn.commit()

        return {
            "success":    True,
            "mapping_id": mapping_id,
            "form_code":  form_code,
            "form_version": form_version,
            "service_id": service_id,
            "maps":       {k: dict(v) for k, v in maps.items()},
        }

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()


def insert_documents_only(payload: dict, cur):

    dcl_map = {}
    document_types = payload.get("documentTypes", [])

    # Sync sequence with actual max id — seed files insert rows with explicit IDs
    # without advancing the sequence, causing nextval to return already-used IDs.
    cur.execute(
        "SELECT setval('m_document_master_id_seq', "
        "(SELECT COALESCE(MAX(id), 0) FROM m_document_master))"
    )

    for dt in document_types:
        for chk in dt.get("checklists", []):

            dcl = chk.get("id")

            if not (isinstance(dcl, str) and dcl.startswith("UK-DCL")):
                continue

            # check existing
            cur.execute(
                'SELECT id FROM m_document_master WHERE "checklistId" = %s',
                (dcl,)
            )
            row = cur.fetchone()

            if row:
                print(f"✅ Found: {dcl} → {row['id']}")
                doc_id = row["id"]
                checklist_code = dcl   # existing

            else:
                print(f"🚀 Inserting new document: {dcl}")

                formats = chk.get("allowedFormats", [])
                ext = ",".join(formats).upper() if formats else "PDF"

                # Insert with temp placeholder — let DB assign the real id via sequence.
                # Do NOT call nextval manually; it causes a double-advance and skips an ID.
                cur.execute(
                    """INSERT INTO m_document_master
                    ("checklistId","stateId","issuerId","departmentId","documentTypeId","issuerById",
                     "checklistDocumentName","checklistDocumentExtension","checklistDocumentMaxSize",
                     "isDocActive","createdAt","updatedAt")
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,true,NOW(),NOW())
                    RETURNING id""",
                    (
                        "__TEMP__",
                        1286,
                        2,
                        1,
                        25,
                        7,
                        chk.get("name"),
                        ext,
                        chk.get("maxSizeMb"),
                    )
                )

                doc_id = cur.fetchone()["id"]
                checklist_code = f"UK-DCL-{doc_id}"

                # Update the real checklistId now that we have the actual id
                cur.execute(
                    'UPDATE m_document_master SET "checklistId" = %s WHERE id = %s',
                    (checklist_code, doc_id)
                )
                print(f"✅ Inserted: {checklist_code} → {doc_id}")

            # ✅ FIXED MAPPING
            dcl_map[checklist_code] = doc_id

            # ✅ UPDATE JSON
            chk["id"] = doc_id

    return payload, dcl_map


# ── Workflow Insert ────────────────────────────────────────────────────────────

def get_existing_workflow(department_id: int, service_id: str) -> list[dict]:
    """Fetch existing workflow steps for this service."""
    conn = get_connection()
    cur  = get_cursor(conn)
    try:
        cur.execute(
            """SELECT id, step, role_id, config_version, status
               FROM c_application_workflow_configuration
               WHERE department_id = %s AND service_id = %s
               ORDER BY config_version DESC, step ASC""",
            (department_id, service_id)
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


def get_roles_for_context() -> list[dict]:
    """Fetch all roles from DB to pass as context to AI."""
    conn = get_connection()
    cur  = get_cursor(conn)
    try:
        cur.execute("SELECT id, name FROM roles ORDER BY id")
        return [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


def insert_workflow(department_id: int, service_id: str, payload: dict) -> dict:
    """
    Insert workflow steps into c_application_workflow_configuration.
    Deletes existing rows for (department_id, service_id, config_version) first.
    Returns {"inserted": N, "step_ids": [...]}
    """
    conn = get_connection()
    cur  = get_cursor(conn)

    config_version = payload.get("meta", {}).get("config_version", 1)
    steps = payload.get("workflow_steps", [])

    if not steps:
        raise ValueError("workflow_steps is empty — nothing to insert")

    try:
        cur.execute(
            "DELETE FROM c_application_workflow_configuration "
            "WHERE department_id = %s AND service_id = %s AND config_version = %s",
            (department_id, service_id, config_version)
        )

        step_ids = []
        for step in steps:
            cur.execute(
                """INSERT INTO c_application_workflow_configuration (
                    step, department_id, service_id, config_version, status,
                    role_id, jurisdiction_level, jurisdiction_level_id,
                    assignment_strategy, assignment_strategy_id,
                    action_master_ids_json, action_allowed_json, transition_map_json,
                    assignment_rule_json, sla_hours, sla_breach_requires_reason,
                    next_allocation_role_id, current_role_id, form_type_id,
                    next_role_id, approver_id, forward_role_id, revert_role_id,
                    is_delay_reason_required, time_in_hours,
                    can_revert_to_investor, can_verify_document,
                    can_forward_to_multiple_role_id, is_own_department,
                    permissable_tab_form_id, document_show_last, process_anytime,
                    subform_action_name
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s, %s,
                    %s
                ) RETURNING id""",
                (
                    step.get("step", 1),
                    department_id,
                    service_id,
                    config_version,
                    step.get("status", "PUBLISHED"),
                    step.get("role_id", 0),
                    step.get("jurisdiction_level", "DISTRICT"),
                    step.get("jurisdiction_level_id"),
                    step.get("assignment_strategy", "ROLE"),
                    step.get("assignment_strategy_id"),
                    json.dumps(step.get("action_master_ids_json", [])),
                    json.dumps(step.get("action_allowed_json", [])),
                    json.dumps(step.get("transition_map_json", {})),
                    json.dumps(step.get("assignment_rule_json")) if step.get("assignment_rule_json") else None,
                    step.get("sla_hours", 0),
                    step.get("sla_breach_requires_reason", True),
                    step.get("next_allocation_role_id"),
                    step.get("current_role_id", 0),
                    step.get("form_type_id", 1),
                    step.get("next_role_id", 0),
                    step.get("approver_id", 0),
                    step.get("forward_role_id", 0),
                    step.get("revert_role_id", 0),
                    step.get("is_delay_reason_required", "N"),
                    str(step.get("time_in_hours", "0")),
                    step.get("can_revert_to_investor", "N"),
                    step.get("can_verify_document", "N"),
                    step.get("can_forward_to_multiple_role_id"),
                    step.get("is_own_department", "N"),
                    step.get("permissable_tab_form_id", ""),
                    step.get("document_show_last", "N"),
                    step.get("process_anytime", "N"),
                    step.get("subform_action_name", ""),
                )
            )
            step_ids.append(cur.fetchone()["id"])

        conn.commit()
        return {"inserted": len(step_ids), "step_ids": step_ids}

    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()
