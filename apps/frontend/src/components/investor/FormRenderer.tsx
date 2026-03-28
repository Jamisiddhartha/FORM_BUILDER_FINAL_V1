'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import { Calendar } from 'primereact/calendar';
import { Tooltip } from 'primereact/tooltip';
import apiClient from '@/lib/api-client';

const BOOTSTRAP_SPANS: Record<number, string> = { 1: "col-md-1", 2: "col-md-2", 3: "col-md-3", 4: "col-md-4", 5: "col-md-5", 6: "col-md-6", 7: "col-md-7", 8: "col-md-8", 9: "col-md-9", 10: "col-md-10", 11: "col-md-11", 12: "col-md-12" };

const ACTION_BUTTON_STYLES: Record<string, { bg: string; border: string }> = {
    APPROVE:               { bg: '#16a34a', border: '#15803d' },
    SUBMIT:                { bg: '#2563eb', border: '#1d4ed8' },
    SUBMIT_REPORT:         { bg: '#2563eb', border: '#1d4ed8' },
    SUBMIT_TO_NODAL:       { bg: '#2563eb', border: '#1d4ed8' },
    FORWARD:               { bg: '#2563eb', border: '#1d4ed8' },
    FORWARD_TO_APPROVER:   { bg: '#2563eb', border: '#1d4ed8' },
    FORWARD_TO_DEPARTMENT: { bg: '#2563eb', border: '#1d4ed8' },
    REJECT:                { bg: '#dc2626', border: '#b91c1c' },
    REVERT_TO_APPLICANT:   { bg: '#ea580c', border: '#c2410c' },
    REVERT_TO_INVESTOR:    { bg: '#ea580c', border: '#c2410c' },
    REVERT_TO_NODAL:       { bg: '#ea580c', border: '#c2410c' },
    QUERY:                 { bg: '#d97706', border: '#b45309' },
    SAVE_DRAFT:            { bg: '#64748b', border: '#475569' },
    HOLD:                  { bg: '#64748b', border: '#475569' },
};

type Props = {
    config: any;
    serviceId?: string;
    submissionId?: number;
    onSubmit?: (values: any, addMoreValues: any) => void;
    onSaveNext?: (payload: {
        values: any;
        addMoreValues: any;
        currentPageIndex: number;
        nextPageIndex: number;
    }) => Promise<boolean | void> | boolean | void;
    onCancel: () => void;
    isSubmitting?: boolean;
    initialData?: { fields: Record<string, any>, addMore: Record<number, any[]> };
    initialPageIndex?: number;
    readOnly?: boolean;
    finalActionLabel?: string;
    onActionButton?: (actionCode: string) => void;
};

type FieldOverrides = {
    required?: boolean;
    visible?: boolean;
    readonly?: boolean;
    editable?: boolean;
};

type ConditionalAnyOfRule = {
    fields: string[];
    when?: any;
    message?: string;
};

type AddMoreRowRule = {
    id: number;
    targetGroupId: number;
    sourceField: string;
    mode: 'exact' | 'min' | 'max';
    applyOn: Array<'add' | 'page_save' | 'submit'>;
    message?: string;
    when?: any;
};

function isEmptyValue(v: any) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') return v.trim().length === 0;
    if (Array.isArray(v)) return v.length === 0;
    return false;
}

const EXTENSION_ALIASES: Record<string, string[]> = {
    '.jpg': ['.jpg', '.jpeg'],
    '.jpeg': ['.jpg', '.jpeg'],
    '.tif': ['.tif', '.tiff'],
    '.tiff': ['.tif', '.tiff'],
    '.htm': ['.htm', '.html'],
    '.html': ['.htm', '.html'],
};

function normalizeAllowedFormats(allowedFormats: any): string[] {
    const raw = Array.isArray(allowedFormats) ? allowedFormats : [];
    const normalized = raw
        .map((item: any) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .map((item: string) => (item.startsWith('.') ? item : `.${item}`));
    const expanded = new Set<string>();
    normalized.forEach((ext) => {
        expanded.add(ext);
        (EXTENSION_ALIASES[ext] || []).forEach((alias) => expanded.add(alias));
    });
    return Array.from(expanded);
}

function getFileExt(fileName?: string): string {
    const name = String(fileName || '');
    const idx = name.lastIndexOf('.');
    if (idx < 0) return '';
    return name.substring(idx).toLowerCase();
}

function safeParseJSON(input: any) {
    if (typeof input === 'string') { try { return JSON.parse(input); } catch (e) { return null; } }
    return input;
}

function getByPath(source: any, path?: string): any {
    if (!path) return source;
    const clean = String(path || '').trim();
    if (!clean) return source;
    return clean.split('.').reduce((acc: any, key: string) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[key];
    }, source);
}

function resolveTextApiConfig(field: any) {
    const componentProps = safeParseJSON(field?.component_props) || {};
    const validation = safeParseJSON(field?.validation_rule) || {};

    const direct =
        componentProps?.textApi ||
        componentProps?.text_api ||
        componentProps?.autoFetch ||
        componentProps?.autofill ||
        componentProps?.prefill ||
        null;

    const apiUrl =
        direct?.apiUrl ??
        direct?.api_url ??
        componentProps?.apiUrl ??
        componentProps?.api_url ??
        validation?.apiUrl ??
        validation?.api_url ??
        null;

    if (!apiUrl) return null;

    return {
        apiUrl: String(apiUrl),
        method: String(
            direct?.method ??
            componentProps?.method ??
            validation?.method ??
            'GET',
        ).toUpperCase(),
        responsePath: String(
            direct?.responsePath ??
            direct?.response_path ??
            componentProps?.responsePath ??
            componentProps?.response_path ??
            validation?.responsePath ??
            validation?.response_path ??
            '',
        ),
        valueKey: String(
            direct?.valueKey ??
            direct?.value_key ??
            componentProps?.valueKey ??
            componentProps?.value_key ??
            validation?.valueKey ??
            validation?.value_key ??
            '',
        ),
        triggerField: String(
            direct?.triggerField ??
            direct?.trigger_field ??
            componentProps?.triggerField ??
            componentProps?.trigger_field ??
            validation?.triggerField ??
            validation?.trigger_field ??
            '',
        ),
        paramsFromFields:
            direct?.paramsFromFields ??
            direct?.params_from_fields ??
            componentProps?.paramsFromFields ??
            componentProps?.params_from_fields ??
            validation?.paramsFromFields ??
            validation?.params_from_fields ??
            {},
        overwrite:
            Boolean(
                direct?.overwrite ??
                componentProps?.overwrite ??
                validation?.overwrite ??
                false,
            ),
        mappings:
            direct?.mappings ??
            direct?.responseMappings ??
            direct?.response_mappings ??
            componentProps?.mappings ??
            componentProps?.responseMappings ??
            componentProps?.response_mappings ??
            validation?.mappings ??
            [],
    };
}

function normalizeThenActions(
    thenJson: any,
    resolveFieldCode: (ref: any) => string | null,
): Array<{ field: string; prop: keyof FieldOverrides; value: boolean }> {
    const actions: Array<{ field: string; prop: keyof FieldOverrides; value: boolean }> = [];
    const parsed = safeParseJSON(thenJson);
    if (!parsed || typeof parsed !== 'object') return actions;

    const pushSet = (fieldRef: any, set: any) => {
        const code = resolveFieldCode(fieldRef);
        if (!code || !set || typeof set !== 'object') return;
        for (const [k, v] of Object.entries(set)) {
            if (['required', 'visible', 'readonly', 'editable'].includes(k) && typeof v === 'boolean') {
                actions.push({ field: code, prop: k as keyof FieldOverrides, value: v });
            }
        }
    };

    const toBool = (v: any): boolean | null => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (s === 'true' || s === '1' || s === 'y' || s === 'yes') return true;
            if (s === 'false' || s === '0' || s === 'n' || s === 'no') return false;
        }
        if (typeof v === 'number') {
            if (v === 1) return true;
            if (v === 0) return false;
        }
        return null;
    };

    const toProp = (action: any): keyof FieldOverrides | null => {
        const raw = String(action ?? '').trim().toLowerCase();
        if (!raw) return null;
        if (raw === 'visible' || raw === 'show' || raw === 'hide') return 'visible';
        if (raw === 'required' || raw === 'mandatory' || raw === 'optional') return 'required';
        if (raw === 'readonly' || raw === 'read_only' || raw === 'read-only' || raw === 'disable' || raw === 'disabled') return 'readonly';
        if (raw === 'editable' || raw === 'enable') return 'editable';
        return null;
    };

    if (Array.isArray(parsed.actions)) {
        for (const a of parsed.actions) {
            if (a?.targetField && a?.action !== undefined) {
                const prop = toProp(a.action);
                const val = toBool(a?.value);
                if (prop && val !== null) {
                    actions.push({ field: String(a.targetField), prop, value: val });
                    continue;
                }
                if (prop === 'visible') {
                    if (String(a.action).toLowerCase() === 'hide') actions.push({ field: String(a.targetField), prop: 'visible', value: false });
                    if (String(a.action).toLowerCase() === 'show') actions.push({ field: String(a.targetField), prop: 'visible', value: true });
                    continue;
                }
                if (prop === 'required') {
                    if (String(a.action).toLowerCase() === 'optional') actions.push({ field: String(a.targetField), prop: 'required', value: false });
                    continue;
                }
            } else {
                pushSet(a?.field ?? a?.targetField ?? a?.builderFieldId ?? a?.targetBuilderFieldId, a?.set);
            }
        }
    }

    if (parsed.set && typeof parsed.set === 'object') {
        for (const [field, patch] of Object.entries(parsed.set)) {
            pushSet(field, patch);
        }
    }

    return actions;
}

function evalConditionTree(
    tree: any,
    values: Record<string, any>,
    resolveFieldCode: (ref: any) => string | null,
): boolean {
    if (!tree || typeof tree !== 'object') return false;
    if (Array.isArray(tree.all)) return tree.all.every((c: any) => evalConditionTree(c, values, resolveFieldCode));
    if (Array.isArray(tree.any)) return tree.any.some((c: any) => evalConditionTree(c, values, resolveFieldCode));

    const fieldRef = tree.field ?? tree.field_code ?? tree.left ?? tree.builderFieldId ?? tree.fieldId;
    const op = String(tree.operator ?? tree.op ?? 'equals').toLowerCase();
    const rhs = tree.value ?? tree.right;
    const normalizeList = (input: any): any[] => {
        if (Array.isArray(input)) return input;
        if (typeof input === 'string') {
            return input
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v.length > 0);
        }
        return [input];
    };
    const normalizeToken = (v: any): string => {
        const s = String(v ?? '').trim();
        if (!s) return '';
        const n = Number(s);
        if (Number.isFinite(n)) return String(n);
        return s.toLowerCase();
    };
    const fieldCode = resolveFieldCode(fieldRef);
    if (!fieldCode) return false;
    const lhs = values[fieldCode];

    switch (op) {
        case 'equals':
        case 'eq':
            return String(lhs) == String(rhs);
        case 'not_equals':
        case 'neq':
            return String(lhs) != String(rhs);
        case 'in': {
            const rhsArr = normalizeList(rhs).map((v) => normalizeToken(v));
            const lhsArr = Array.isArray(lhs) ? lhs : (lhs ? [lhs] : []);
            return lhsArr.some((x: any) => rhsArr.includes(normalizeToken(x)));
        }
        case 'not_in': {
            const rhsArr = normalizeList(rhs).map((v) => normalizeToken(v));
            const lhsArr = Array.isArray(lhs) ? lhs : (lhs ? [lhs] : []);
            return lhsArr.every((x: any) => !rhsArr.includes(normalizeToken(x)));
        }
        case 'contains': {
            const rhsArr = normalizeList(rhs).map((v) => normalizeToken(v));
            if (typeof lhs === 'string') {
                const leftNorm = normalizeToken(lhs);
                return rhsArr.some((v) => leftNorm.includes(v));
            }
            const lhsArr = Array.isArray(lhs) ? lhs : (lhs ? [lhs] : []);
            return lhsArr.some((x: any) => rhsArr.includes(normalizeToken(x)));
        }
        case 'greater_than':
        case 'gt':
            return Number(lhs) > Number(rhs);
        case 'less_than':
        case 'lt':
            return Number(lhs) < Number(rhs);
        case 'is_empty':
            return isEmptyValue(lhs);
        case 'is_not_empty':
            return !isEmptyValue(lhs);
        default:
            return false;
    }
}

function buildConditionalAnyOfRules(
    allFields: any[],
    resolveFieldCode: (ref: any) => string | null,
): ConditionalAnyOfRule[] {
    const rules: ConditionalAnyOfRule[] = [];
    const seen = new Set<string>();

    const pushRule = (candidate: any) => {
        if (!candidate || typeof candidate !== 'object') return;
        const rawFields = Array.isArray(candidate.fields) ? candidate.fields : [];
        const fields = rawFields
            .map((f: any) => resolveFieldCode(f))
            .filter((f: string | null): f is string => Boolean(f));
        if (fields.length < 2) return;
        const normalized = {
            fields,
            when: candidate.when ?? null,
            message: typeof candidate.message === 'string' ? candidate.message : undefined,
        };
        const key = JSON.stringify(normalized);
        if (seen.has(key)) return;
        seen.add(key);
        rules.push(normalized);
    };

    allFields.forEach((field: any) => {
        const validation = safeParseJSON(field?.validation_rule) || {};
        const direct = validation?.required_any_of ?? validation?.conditional_any_of ?? validation?.at_least_one_of;
        if (Array.isArray(direct)) {
            direct.forEach((r: any) => pushRule(r));
        } else if (direct && typeof direct === 'object') {
            pushRule(direct);
        }
    });

    return rules;
}

function buildAddMoreRowRules(
    rules: any[],
    resolveFieldCode: (ref: any) => string | null,
): AddMoreRowRule[] {
    const out: AddMoreRowRule[] = [];
    const seen = new Set<string>();
    const rows = Array.isArray(rules) ? rules : [];

    rows.forEach((r: any) => {
        if (String(r?.is_active ?? '').toUpperCase() !== 'Y') return;
        const thenJson = safeParseJSON(r?.then_json) || {};
        const actions = Array.isArray(thenJson?.actions) ? thenJson.actions : [];

        actions.forEach((a: any) => {
            if (String(a?.action || '') !== 'addmore_row_count') return;
            const targetGroupId = Number(a?.targetGroupId);
            if (!Number.isFinite(targetGroupId) || targetGroupId <= 0) return;
            const sourceField = resolveFieldCode(a?.sourceField);
            if (!sourceField) return;
            const modeRaw = String(a?.mode || 'exact').toLowerCase();
            const mode: 'exact' | 'min' | 'max' =
                modeRaw === 'min' || modeRaw === 'max' ? (modeRaw as 'min' | 'max') : 'exact';
            const defaultApplyOn: Array<'add' | 'page_save' | 'submit'> = ['add', 'page_save', 'submit'];
            const applyOnRaw = Array.isArray(a?.applyOn) ? a.applyOn : defaultApplyOn;
            const applyOn = applyOnRaw
                .map((x: any) => String(x || '').toLowerCase())
                .filter((x: string) => x === 'add' || x === 'page_save' || x === 'submit') as Array<
                    'add' | 'page_save' | 'submit'
                >;
            const normalizedApplyOn: Array<'add' | 'page_save' | 'submit'> =
                applyOn.length > 0 ? applyOn : defaultApplyOn;
            const key = `${r?.id}|${targetGroupId}|${sourceField}|${mode}|${normalizedApplyOn.join(',')}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push({
                id: Number(r?.id || 0),
                targetGroupId,
                sourceField,
                mode,
                applyOn: normalizedApplyOn,
                message: typeof a?.message === 'string' ? a.message : undefined,
                when: safeParseJSON(r?.when_json),
            });
        });
    });

    return out.sort((a, b) => a.id - b.id);
}

// ✅ ISOLATED DYNAMIC DROPDOWN FOR ADD-MORE ROWS
function AddMoreDynamicDropdown({ masterId, parentValue, value, onChange, disabled, placeholder, className, appendTo, isMulti }: any) {
    const [opts, setOpts] = useState<any[]>([]);

    useEffect(() => {
        if (!masterId) return;
        if (parentValue !== undefined && isEmptyValue(parentValue)) {
            setOpts([]);
            return;
        }

        const parentValueParam = Array.isArray(parentValue) ? parentValue.join(',') : String(parentValue ?? '');

        apiClient.get(`/investor/services/master-tables/${masterId}/options`, {
            params: { parentValue: parentValueParam, includeInactive: 1, take: 20000 }
        }).then(res => setOpts(res.data || [])).catch(() => setOpts([]));

    }, [masterId, parentValue]);

    const normalizedOpts = opts.map(o => ({ label: o.label, value: String(o.value) }));

    if (isMulti) return <MultiSelect className={className} value={value ?? []} options={normalizedOpts} onChange={(e) => onChange(e.value)} disabled={disabled} placeholder={placeholder} filter display="chip" appendTo={appendTo} />;
    return <Dropdown className={className} value={value ? String(value) : null} options={normalizedOpts} onChange={(e) => onChange(e.value)} placeholder={placeholder} disabled={disabled} filter appendTo={appendTo} showClear />;
}

// ✅ MAIN DROPDOWN COMPONENT (FOR GLOBAL FORM)
function MasterDropdown({ masterCode, parentValue, value, onChange, disabled, placeholder, className, appendTo, isMulti }: any) {
    const [opts, setOpts] = useState<any[]>([]);

    useEffect(() => {
        if (!masterCode) return;
        if (parentValue !== undefined && isEmptyValue(parentValue)) {
            setOpts([]);
            return;
        }

        const parentValueParam = Array.isArray(parentValue) ? parentValue.join(',') : String(parentValue ?? '');

        apiClient.get(`/master/master-options`, {
            params: { code: masterCode, parent: parentValueParam }
        }).then(res => setOpts(res.data || [])).catch(() => setOpts([]));

    }, [masterCode, parentValue]);

    const normalizedOpts = opts.map(o => ({ label: o.label, value: String(o.value) }));

    if (isMulti) return <MultiSelect className={className} value={value ?? []} options={normalizedOpts} onChange={(e) => onChange(e.value)} disabled={disabled} placeholder={placeholder} filter display="chip" appendTo={appendTo} />;
    return <Dropdown className={className} value={value ? String(value) : null} options={normalizedOpts} onChange={(e) => onChange(e.value)} placeholder={placeholder} disabled={disabled} filter appendTo={appendTo} showClear />;
}

function DynamicFieldDropdown({ masterId, parentValue, value, onChange, disabled, placeholder, className, appendTo, isMulti }: any) {
    const [opts, setOpts] = useState<any[]>([]);

    useEffect(() => {
        if (!masterId) return;
        if (parentValue !== undefined && isEmptyValue(parentValue)) {
            setOpts([]);
            return;
        }

        const parentValueParam = Array.isArray(parentValue) ? parentValue.join(',') : String(parentValue ?? '');

        apiClient.get(`/investor/services/master-tables/${masterId}/options`, {
            params: { parentValue: parentValueParam, includeInactive: 1, take: 20000 }
        }).then(res => setOpts(res.data || [])).catch(() => setOpts([]));
    }, [masterId, parentValue]);

    const normalizedOpts = opts.map(o => ({ label: o.label, value: String(o.value) }));

    if (isMulti) return <MultiSelect className={className} value={value ?? []} options={normalizedOpts} onChange={(e) => onChange(e.value)} disabled={disabled} placeholder={placeholder} filter display="chip" appendTo={appendTo} />;
    return <Dropdown className={className} value={value ? String(value) : null} options={normalizedOpts} onChange={(e) => onChange(e.value)} placeholder={placeholder} disabled={disabled} filter appendTo={appendTo} showClear />;
}

export function FormRenderer({
    config,
    serviceId,
    submissionId,
    onSubmit,
    onSaveNext,
    onCancel,
    isSubmitting = false,
    initialData,
    initialPageIndex = 0,
    readOnly = false,
    finalActionLabel,
    onActionButton,
}: Props) {
    const [activePageIndex, setActivePageIndex] = useState(initialPageIndex);
    const [values, setValues] = useState<Record<string, any>>(initialData?.fields || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Set<string>>(new Set());
    const [addMoreValues, setAddMoreValues] = useState<Record<number, any[]>>(initialData?.addMore || {});
    const appendTo = useMemo(() => (typeof window === 'undefined' ? undefined : document.body), []);
    const [uploadedDocByChecklistId, setUploadedDocByChecklistId] = useState<Record<number, any>>({});
    const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
    const [uploadErrorByChecklistId, setUploadErrorByChecklistId] = useState<Record<number, string>>({});
    const [addMoreGroupErrors, setAddMoreGroupErrors] = useState<Record<number, string>>({});
    const apiBaseUrl = String(process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const autoFetchedSignatureByFieldRef = React.useRef<Record<string, string>>({});
    const autoFetchResponseCacheRef = React.useRef<Record<string, any>>({});
    const autoFetchPendingBySignatureRef = React.useRef<Record<string, Promise<any>>>({});

    const pages = config?.pages ?? [];
    const rules = Array.isArray(config?.rules) ? config.rules : [];
    const activePage = pages[activePageIndex];
    const isLastPage = activePageIndex === pages.length - 1;

    useEffect(() => {
        setValues(initialData?.fields || {});
        setAddMoreValues(initialData?.addMore || {});
    }, [initialData]);

    useEffect(() => {
        setActivePageIndex(initialPageIndex);
    }, [initialPageIndex]);

    const allFields = useMemo(() => {
        const out: any[] = [];
        (pages || []).forEach((p: any) => p.categories?.forEach((c: any) => c.fields?.forEach((f: any) => out.push(f))));
        return out;
    }, [pages]);

    const fieldIdToCode = useMemo(() => {
        const map = new Map<number, string>();
        allFields.forEach((f: any) => {
            if (f?.id && f?.field_code) map.set(Number(f.id), String(f.field_code));
        });
        return map;
    }, [allFields]);

    const resolveFieldCode = useCallback((ref: any): string | null => {
        if (ref === null || ref === undefined) return null;
        if (typeof ref === 'number') return fieldIdToCode.get(ref) ?? null;
        const s = String(ref).trim();
        if (!s) return null;
        if (/^\d+$/.test(s)) return fieldIdToCode.get(Number(s)) ?? null;
        return s;
    }, [fieldIdToCode]);

    const computedOverrides = useMemo<Record<string, FieldOverrides>>(() => {
        const out: Record<string, FieldOverrides> = {};
        const activeRulesRaw = rules.filter((r: any) => String(r?.is_active ?? '').toUpperCase() === 'Y');
        const latestRuleByWhen = new Map<string, any>();
        activeRulesRaw.forEach((r: any) => {
            const key = JSON.stringify(safeParseJSON(r?.when_json) ?? {});
            const prev = latestRuleByWhen.get(key);
            if (!prev || Number(r?.id || 0) > Number(prev?.id || 0)) {
                latestRuleByWhen.set(key, r);
            }
        });
        const activeRules = Array.from(latestRuleByWhen.values()).sort(
            (a: any, b: any) => Number(a?.id || 0) - Number(b?.id || 0),
        );

        for (const r of activeRules) {
            try {
                if (evalConditionTree(r?.when_json, values, resolveFieldCode)) {
                    const actions = normalizeThenActions(r?.then_json, resolveFieldCode);
                    for (const a of actions) {
                        if (!out[a.field]) out[a.field] = {};
                        out[a.field][a.prop] = a.value;
                    }
                }
            } catch {
                // Ignore malformed rule payloads to avoid breaking form runtime.
            }
        }

        return out;
    }, [rules, values, resolveFieldCode]);

    const conditionalAnyOfRules = useMemo(
        () => buildConditionalAnyOfRules(allFields, resolveFieldCode),
        [allFields, resolveFieldCode],
    );

    const addMoreRowRules = useMemo(
        () => buildAddMoreRowRules(rules, resolveFieldCode),
        [rules, resolveFieldCode],
    );

    const hiddenAddMoreChildFieldIds = useMemo(() => {
        const ids = new Set<number>();
        const codes = new Set<string>();
        (pages || []).forEach((p: any) =>
            p.categories?.forEach((c: any) =>
                c.fields?.forEach((f: any) => {
                    if (String(f?.input_type).toLowerCase() !== 'addmore') return;
                    (f.add_more_groups || []).forEach((g: any) =>
                        (g.columns || []).forEach((col: any) => {
                            if (col?.builder_field_id) ids.add(Number(col.builder_field_id));
                            if (col?.field_code) codes.add(String(col.field_code));
                        })
                    );
                })
            )
        );
        return { ids, codes };
    }, [pages]);

    useEffect(() => {
        if (readOnly) return;
        if (!Array.isArray(allFields) || allFields.length === 0) return;

        const replaceTokens = (raw: string) => {
            return String(raw || '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, tokenRaw) => {
                const token = String(tokenRaw || '').trim();
                if (!token) return '';
                if (token === 'serviceId') return String(serviceId || '');
                if (token === 'submissionId') return String(submissionId || '');
                return String(values?.[token] ?? '');
            });
        };

        allFields.forEach((sourceField: any) => {
            const sourceInputType = String(sourceField?.input_type || '').toLowerCase().trim();
            if (
                sourceInputType !== 'text' &&
                sourceInputType !== 'email' &&
                sourceInputType !== 'tel' &&
                sourceInputType !== 'number'
            ) return;

            const cfg = resolveTextApiConfig(sourceField);
            if (!cfg?.apiUrl) return;

            const triggerField = String(cfg.triggerField || '').trim();
            if (triggerField && isEmptyValue(values?.[triggerField])) return;

            const resolvedUrl = replaceTokens(cfg.apiUrl);
            if (!resolvedUrl) return;

            const params: Record<string, any> = {};
            const paramsMap =
                cfg.paramsFromFields && typeof cfg.paramsFromFields === 'object'
                    ? cfg.paramsFromFields
                    : {};
            Object.entries(paramsMap).forEach(([paramKey, fieldCodeRef]: any) => {
                const sourceCode = String(fieldCodeRef || '').trim();
                if (!sourceCode) return;
                params[paramKey] = values?.[sourceCode] ?? '';
            });

            const mappingsRaw = Array.isArray(cfg.mappings) ? cfg.mappings : [];
            const mappings = mappingsRaw
                .map((m: any) => ({
                    targetField: String(
                        m?.targetField ??
                        m?.target_field ??
                        m?.targetFieldCode ??
                        m?.target_field_code ??
                        m?.field ??
                        '',
                    ).trim(),
                    responsePath: String(m?.responsePath ?? m?.response_path ?? cfg.responsePath ?? '').trim(),
                    valueKey: String(m?.valueKey ?? m?.value_key ?? '').trim(),
                }))
                .filter((m: any) => m.targetField && m.valueKey);

            if (mappings.length === 0 && String(cfg.valueKey || '').trim()) {
                mappings.push({
                    targetField: String(sourceField?.field_code || '').trim(),
                    responsePath: String(cfg.responsePath || '').trim(),
                    valueKey: String(cfg.valueKey || '').trim(),
                });
            }
            if (mappings.length === 0) return;

            const hasAtLeastOneFillableTarget = mappings.some((m: any) => {
                const current = values?.[m.targetField];
                return cfg.overwrite || isEmptyValue(current);
            });
            if (!hasAtLeastOneFillableTarget) return;

            const signature = JSON.stringify({
                url: resolvedUrl,
                method: cfg.method || 'GET',
                params,
                triggerValue: triggerField ? values?.[triggerField] : '',
            });
            const sourceCodeKey = String(sourceField?.field_code || sourceField?.id || '');
            if (autoFetchedSignatureByFieldRef.current[sourceCodeKey] === signature) return;
            autoFetchedSignatureByFieldRef.current[sourceCodeKey] = signature;

            const isAbsolute = /^https?:\/\//i.test(resolvedUrl);
            const requestUrl = isAbsolute ? resolvedUrl : resolvedUrl.startsWith('/') ? resolvedUrl : `/${resolvedUrl}`;
            const method = String(cfg.method || 'GET').toUpperCase();

            const getPayloadForSignature = (): Promise<any> => {
                if (autoFetchResponseCacheRef.current[signature] !== undefined) {
                    return Promise.resolve(autoFetchResponseCacheRef.current[signature]);
                }
                const pending = autoFetchPendingBySignatureRef.current[signature];
                if (pending) return pending;

                const req =
                    method === 'POST'
                        ? apiClient.post(requestUrl, params)
                        : apiClient.get(requestUrl, { params });
                const reqPromise = req
                    .then((res: any) => {
                        const payload = res?.data;
                        autoFetchResponseCacheRef.current[signature] = payload;
                        return payload;
                    })
                    .finally(() => {
                        delete autoFetchPendingBySignatureRef.current[signature];
                    });
                autoFetchPendingBySignatureRef.current[signature] = reqPromise;
                return reqPromise;
            };

            getPayloadForSignature()
                .then((payload: any) => {
                    setValues((prev) => {
                        let changed = false;
                        const next = { ...prev };

                        mappings.forEach((m: any) => {
                            const byPath = m.responsePath ? getByPath(payload, m.responsePath) : payload;
                            let picked = getByPath(byPath, m.valueKey);
                            if (picked === undefined || picked === null) return;

                            const normalized = typeof picked === 'string' ? picked : String(picked);
                            const prevVal = prev?.[m.targetField];
                            if (!cfg.overwrite && !isEmptyValue(prevVal)) return;
                            if (String(prevVal ?? '') === String(normalized ?? '')) return;
                            next[m.targetField] = normalized;
                            changed = true;
                        });

                        return changed ? next : prev;
                    });
                })
                .catch(() => {
                    // ignore auto-fetch failure; manual user input remains available
                });
        });
    }, [allFields, readOnly, serviceId, submissionId, values]);

    const dmsChecklists = useMemo(() => {
        const types = Array.isArray(config?.dms?.documentTypes) ? config.dms.documentTypes : [];
        return types.flatMap((type: any) => {
            const checklists = Array.isArray(type?.checklists) ? type.checklists : [];
            return checklists.map((checklist: any) => ({
                ...checklist,
                __typeName: type?.name || '',
            }));
        });
    }, [config]);

    const evaluateCondition = useCallback((condition: any) => {
        if (!condition?.fieldName) return true;
        const left = values?.[condition.fieldName];
        const rightRaw = condition?.value;
        const operator = String(condition?.operator || 'eq').toLowerCase();

        const leftStr = left === undefined || left === null ? '' : String(left);
        const rightStr = rightRaw === undefined || rightRaw === null ? '' : String(rightRaw);
        const leftNum = Number(left);
        const rightNum = Number(rightRaw);

        switch (operator) {
            case 'eq': return leftStr === rightStr;
            case 'neq': return leftStr !== rightStr;
            case 'gt': return Number.isFinite(leftNum) && Number.isFinite(rightNum) ? leftNum > rightNum : false;
            case 'gte': return Number.isFinite(leftNum) && Number.isFinite(rightNum) ? leftNum >= rightNum : false;
            case 'lt': return Number.isFinite(leftNum) && Number.isFinite(rightNum) ? leftNum < rightNum : false;
            case 'lte': return Number.isFinite(leftNum) && Number.isFinite(rightNum) ? leftNum <= rightNum : false;
            case 'contains': return leftStr.toLowerCase().includes(rightStr.toLowerCase());
            default: return true;
        }
    }, [values]);

    const docsForField = useCallback((fieldCode: string) => {
        return dmsChecklists.filter((doc: any) => {
            const showAfterField = String(doc?.showAfter?.fieldName || '').trim();
            if (!showAfterField || showAfterField !== fieldCode) return false;
            return evaluateCondition(doc?.showCondition);
        });
    }, [dmsChecklists, evaluateCondition]);

    const getEffectiveAddMoreConstraint = useCallback((
        groupId: number,
        stage: 'add' | 'page_save' | 'submit',
    ): { mode: 'exact' | 'min' | 'max'; expectedRows: number; message?: string } | null => {
        const candidates = addMoreRowRules
            .filter((r) => Number(r.targetGroupId) === Number(groupId) && r.applyOn.includes(stage))
            .filter((r) => {
                if (!r.when || (typeof r.when === 'object' && Array.isArray((r.when as any).all) && (r.when as any).all.length === 0)) return true;
                try {
                    return evalConditionTree(r.when, values, resolveFieldCode);
                } catch {
                    return false;
                }
            })
            .sort((a, b) => b.id - a.id);
        const selected = candidates[0];
        if (!selected) return null;
        const sourceRaw = values?.[selected.sourceField];
        const expectedRows = Number(sourceRaw);
        if (!Number.isFinite(expectedRows) || expectedRows <= 0) return null;
        return {
            mode: selected.mode,
            expectedRows: Math.floor(expectedRows),
            message: selected.message,
        };
    }, [addMoreRowRules, resolveFieldCode, values]);

    const resolveFileUrl = useCallback((path?: string) => {
        const raw = String(path || '').trim();
        if (!raw) return '#';
        if (/^https?:\/\//i.test(raw)) return raw;
        const cleanPath = raw.replace(/^\/+/, '');
        if (!apiBaseUrl) return `/${cleanPath}`;
        return `${apiBaseUrl}/${cleanPath}`;
    }, [apiBaseUrl]);

    useEffect(() => {
        if (!submissionId || !serviceId) return;
        apiClient.get('/common/documents/uploads', { params: { submissionId, serviceId } })
            .then((res) => {
                const uploads = Array.isArray(res?.data?.uploads) ? res.data.uploads : [];
                const byChecklist: Record<number, any> = {};
                uploads.forEach((item: any) => {
                    const key = Number(item.documentMasterId);
                    if (Number.isFinite(key)) byChecklist[key] = item;
                });
                setUploadedDocByChecklistId(byChecklist);
            })
            .catch(() => setUploadedDocByChecklistId({}));
    }, [submissionId, serviceId]);

    const handleInlineDocumentUpload = useCallback(async (checklistId: number, file?: File | null) => {
        if (!file || !submissionId || !serviceId) return;
        const targetDoc = dmsChecklists.find((d: any) => Number(d?.id) === Number(checklistId));
        const allowedExts = normalizeAllowedFormats(targetDoc?.allowedFormats);
        const fileExt = getFileExt(file.name);
        if (allowedExts.length > 0 && (!fileExt || !allowedExts.includes(fileExt))) {
            setUploadErrorByChecklistId((prev) => ({
                ...prev,
                [checklistId]: `Invalid document type. Allowed: ${allowedExts.join(', ')}`,
            }));
            return;
        }

        try {
            setUploadingDocId(checklistId);
            setUploadErrorByChecklistId((prev) => ({ ...prev, [checklistId]: '' }));
            const form = new FormData();
            form.append('file', file);
            form.append('submissionId', String(submissionId));
            form.append('documentMasterId', String(checklistId));
            form.append('serviceId', String(serviceId));
            form.append('uploadType', 'new');
            form.append('comments', '');
            form.append('validFrom', '');
            form.append('validTo', '');
            form.append('docDateOfIssuance', '');
            form.append('isDocumentActive', 'Y');

            const res = await apiClient.post('/common/documents/upload', form);
            const uploaded = res?.data?.data;
            if (uploaded) {
                setUploadedDocByChecklistId((prev) => ({
                    ...prev,
                    [checklistId]: {
                        ...prev[checklistId],
                        ...uploaded,
                        documentMasterId: checklistId,
                    },
                }));
            }
        } catch (e: any) {
            const message = e?.response?.data?.message || e?.message || 'Upload failed. Please try again.';
            setUploadErrorByChecklistId((prev) => ({ ...prev, [checklistId]: String(message) }));
        } finally {
            setUploadingDocId(null);
        }
    }, [submissionId, serviceId, dmsChecklists]);

    useEffect(() => {
        if (!config || (initialData?.addMore && Object.keys(initialData.addMore).length > 0)) return;
        const initialAddMore: any = {};
        pages.forEach((p: any) => {
            p.categories.forEach((c: any) => {
                c.fields.forEach((f: any) => {
                    if (f.input_type === 'addmore' && f.add_more_groups) {
                        f.add_more_groups.forEach((g: any) => {
                            const min = typeof g.min_rows === 'number' && g.min_rows > 0 ? g.min_rows : 0;
                            initialAddMore[g.id] = Array.from({ length: min }).map(() => ({}));
                        });
                    }
                });
            });
        });
        setAddMoreValues(initialAddMore);
    }, [config, initialData, pages]);

    const validateField = useCallback((field: any, value: any, override?: FieldOverrides) => {
        const required = override?.required ?? field.is_required === 'Y';
        if (required && isEmptyValue(value)) return `${field.label || 'This field'} is required`;

        const rules = (typeof field.validation_rule === 'string' ? safeParseJSON(field.validation_rule) : field.validation_rule) || {};

        if (value instanceof File || (value && typeof value === 'object' && value.name)) {
            const accept = rules.accept;
            if (accept) {
                const fileExt = '.' + value.name.split('.').pop()?.toLowerCase();
                const acceptedTypes = accept.split(',').map((t: string) => t.trim().toLowerCase());
                if (!acceptedTypes.includes(fileExt) && !acceptedTypes.includes(value.type)) {
                    return `Invalid file type. Allowed: ${accept}`;
                }
            }
            return '';
        }

        return '';
    }, []);

    const handleChange = (code: string, val: any) => {
        if (readOnly) return;
        setAddMoreGroupErrors({});
        setValues(p => {
            const next = { ...p, [code]: val };

            // Clear cascading children when parent changes (Country -> State -> District)
            const queue = [code];
            const visited = new Set<string>();
            while (queue.length) {
                const changedCode = queue.shift()!;
                if (visited.has(changedCode)) continue;
                visited.add(changedCode);

                allFields.forEach((f: any) => {
                    const pId = f?.option_config?.parent_builder_field_id;
                    if (!pId) return;
                    const pCode = fieldIdToCode.get(Number(pId));
                    if (pCode !== changedCode) return;
                    if (next[f.field_code] !== undefined) delete next[f.field_code];
                    queue.push(f.field_code);
                });
            }

            return next;
        });
        setTouched(p => new Set(p).add(code));
        const fieldMeta = allFields.find((f: any) => String(f?.field_code || '') === String(code || ''));
        const err = validateField(fieldMeta || { is_required: 'N', label: '' }, val, computedOverrides[String(code || '')]);
        setErrors((prev) => { const copy = { ...prev }; if (err) copy[code] = err; else delete copy[code]; return copy; });
    };

    const onNext = async () => {
        if (readOnly) {
            if (isLastPage) onCancel();
            else setActivePageIndex(p => p + 1);
            return;
        }
        setAddMoreGroupErrors({});
        const currentFields = activePage?.categories.flatMap((c: any) => c.fields) || [];
        let valid = true;
        const newErrors: Record<string, string> = {};
        const newTouched = new Set(touched);
        newTouched.add('ALL_PAGE');

        currentFields.forEach((field: any) => {
            if (field.input_type !== 'addmore' && field.input_type !== 'button') {
                const val = values[field.field_code];
                const ov = computedOverrides[field.field_code];
                if (ov?.visible === false) return;
                const required = ov?.required ?? field.is_required === 'Y';
                if (required && isEmptyValue(val)) {
                    newErrors[field.field_code] = `${field.label} is required`;
                    valid = false;
                    newTouched.add(field.field_code);
                }
                const err = validateField(field, val, ov);
                if (err) {
                    newErrors[field.field_code] = err;
                    valid = false;
                    newTouched.add(field.field_code);
                }
            } else {
                field.add_more_groups?.forEach((g: any) => {
                    const rows = addMoreValues[g.id] || [];
                    if (rows.length < (g.min_rows || 0)) valid = false;
                    if (typeof g.max_rows === 'number' && rows.length > Number(g.max_rows)) valid = false;

                    const stage: 'page_save' | 'submit' = isLastPage ? 'submit' : 'page_save';
                    const dynamic = getEffectiveAddMoreConstraint(g.id, stage);
                    if (dynamic) {
                        const expected = Number(dynamic.expectedRows);
                        if (Number.isFinite(expected)) {
                            if (dynamic.mode === 'exact' && rows.length !== expected) {
                                valid = false;
                                setAddMoreGroupErrors((prev) => ({
                                    ...prev,
                                    [g.id]: dynamic.message || `Rows must be exactly ${expected}. Current: ${rows.length}.`,
                                }));
                            }
                            if (dynamic.mode === 'min' && rows.length < expected) {
                                valid = false;
                                setAddMoreGroupErrors((prev) => ({
                                    ...prev,
                                    [g.id]: dynamic.message || `At least ${expected} row(s) required.`,
                                }));
                            }
                            if (dynamic.mode === 'max' && rows.length > expected) {
                                valid = false;
                                setAddMoreGroupErrors((prev) => ({
                                    ...prev,
                                    [g.id]: dynamic.message || `Maximum ${expected} row(s) allowed.`,
                                }));
                            }
                        }
                    }
                    rows.forEach((row: any, rIdx: number) => {
                        g.columns.forEach((col: any) => {
                            const val = row[col.field_code];
                            if (col.is_required === 'Y' && isEmptyValue(val)) {
                                valid = false;
                                newTouched.add(`${g.id}_${rIdx}_${col.field_code}`);
                            }
                        });
                    });
                });
            }
        });

        // Dynamic cross-field validation: at least one field from configured group must be filled.
        conditionalAnyOfRules.forEach((rule) => {
            const isWhenMatched = rule.when ? evalConditionTree(rule.when, values, resolveFieldCode) : true;
            if (!isWhenMatched) return;
            const hasAnyValue = rule.fields.some((fieldCode) => !isEmptyValue(values?.[fieldCode]));
            if (hasAnyValue) return;

            valid = false;
            const defaultMessage = `At least one of these fields is required: ${rule.fields.join(', ')}`;
            const message = rule.message || defaultMessage;
            rule.fields.forEach((fieldCode) => {
                newErrors[fieldCode] = message;
                newTouched.add(fieldCode);
            });
        });

        setTouched(newTouched);
        setErrors(newErrors);

        if (!valid) return;
        if (isLastPage) {
            if (onSubmit) await onSubmit(values, addMoreValues);
            return;
        }

        if (onSaveNext) {
            const result = await onSaveNext({
                values,
                addMoreValues,
                currentPageIndex: activePageIndex,
                nextPageIndex: activePageIndex + 1,
            });
            if (result === false) return;
        }

        setActivePageIndex(p => p + 1);
        setTouched(new Set());
        setErrors({});
    };

    const renderInput = (field: any) => {
        const val = values[field.field_code];
        const hasErr = errors[field.field_code] && (touched.has(field.field_code) || touched.has('ALL_PAGE'));
        const css = `w-100 ${hasErr ? 'p-invalid' : ''}`;
        const ov = computedOverrides[field.field_code] || {};
        const disabled = readOnly || ov.readonly === true || ov.editable === false || field.is_readonly === 'Y';
        const placeholder = field.placeholder || '';
        const opts = Array.isArray(field.options) ? field.options : [];
        const inputType = String(field.input_type || 'text').toLowerCase().trim();

        switch (inputType) {
            case 'textarea': return <InputTextarea className={css} value={val ?? ''} rows={3} onChange={(e) => handleChange(field.field_code, e.target.value)} disabled={disabled} placeholder={placeholder} />;
            case 'number': return <InputNumber className={css} value={typeof val === 'number' ? val : null} onValueChange={(e) => handleChange(field.field_code, e.value)} disabled={disabled} useGrouping={false} placeholder={placeholder} />;
            case 'select':
                if (field.option_config?.master_table_id) {
                    const pId = field.option_config?.parent_builder_field_id;
                    const pCode = pId ? fieldIdToCode.get(Number(pId)) : null;
                    const pVal = pCode ? values[pCode] : undefined;
                    return <DynamicFieldDropdown masterId={field.option_config.master_table_id} parentValue={pVal} value={val} onChange={(v: any) => handleChange(field.field_code, v)} disabled={disabled} placeholder={placeholder || 'Select...'} className={css} appendTo={appendTo} />;
                }
                if (field.master_code) {
                    const pVal = field.parent_field_code ? values[field.parent_field_code] : undefined;
                    return <MasterDropdown masterCode={field.master_code} parentValue={pVal} value={val} onChange={(v: any) => handleChange(field.field_code, v)} disabled={disabled} placeholder={placeholder || 'Select...'} className={css} appendTo={appendTo} />;
                }
                return <Dropdown className={css} value={val ? String(val) : null} options={opts} onChange={(e) => handleChange(field.field_code, e.value)} disabled={disabled} placeholder={placeholder || 'Select...'} filter appendTo={appendTo} showClear />;
            case 'multiselect':
                if (field.option_config?.master_table_id) {
                    const pId = field.option_config?.parent_builder_field_id;
                    const pCode = pId ? fieldIdToCode.get(Number(pId)) : null;
                    const pVal = pCode ? values[pCode] : undefined;
                    return <DynamicFieldDropdown masterId={field.option_config.master_table_id} parentValue={pVal} value={val ?? []} onChange={(v: any) => handleChange(field.field_code, v)} disabled={disabled} placeholder={placeholder || 'Select...'} className={css} appendTo={appendTo} isMulti />;
                }
                if (field.master_code) {
                    const pVal = field.parent_field_code ? values[field.parent_field_code] : undefined;
                    return <MasterDropdown masterCode={field.master_code} parentValue={pVal} value={val ?? []} onChange={(v: any) => handleChange(field.field_code, v)} disabled={disabled} placeholder={placeholder || 'Select...'} className={css} appendTo={appendTo} isMulti />;
                }
                return <MultiSelect className={css} value={val ?? []} options={opts} onChange={(e) => handleChange(field.field_code, e.value)} disabled={disabled} placeholder={placeholder || 'Select multiple...'} filter display="chip" appendTo={appendTo} />;
            case 'radio': return <div className="d-flex flex-wrap gap-4 mt-2">{opts.map((o: any) => <label key={o.value} className="d-flex align-items-center gap-2 cursor-pointer"><RadioButton name={field.field_code} value={String(o.value)} checked={String(val) === String(o.value)} onChange={(e) => handleChange(field.field_code, e.value)} disabled={disabled} /><span className="fw-medium">{o.label}</span></label>)}</div>;
            case 'checkbox':
                if (opts.length > 0) {
                    const selectedValues = Array.isArray(val)
                        ? val.map((item: any) => String(item))
                        : isEmptyValue(val)
                            ? []
                            : [String(val)];
                    return (
                        <div className="d-flex flex-column gap-2 mt-2">
                            {opts.map((o: any, idx: number) => {
                                const optionValue = String(o?.value ?? o?.label ?? idx);
                                const isChecked = selectedValues.includes(optionValue);
                                return (
                                    <label key={`${field.field_code}_${optionValue}_${idx}`} className="d-flex align-items-start gap-2 cursor-pointer">
                                        <Checkbox
                                            inputId={`${field.field_code}_${idx}`}
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const nextValues = e.checked
                                                    ? [...selectedValues, optionValue]
                                                    : selectedValues.filter((item) => item !== optionValue);
                                                handleChange(field.field_code, nextValues);
                                            }}
                                            disabled={disabled}
                                        />
                                        <span className="fw-medium">{o?.label ?? optionValue}</span>
                                    </label>
                                );
                            })}
                        </div>
                    );
                }
                return <div className="mt-2"><Checkbox checked={!!val} onChange={(e) => handleChange(field.field_code, e.checked)} disabled={disabled} /></div>;
            case 'date': return <Calendar className={css} value={val ? new Date(val) : null} onChange={(e) => handleChange(field.field_code, e.value)} showIcon disabled={disabled} placeholder={placeholder} />;
            case 'datetime-local': return <Calendar className={css} value={val ? new Date(val) : null} onChange={(e) => handleChange(field.field_code, e.value)} showIcon showTime disabled={disabled} placeholder={placeholder} />;
            case 'file': {
                const rules = (typeof field.validation_rule === 'string' ? safeParseJSON(field.validation_rule) : field.validation_rule) || {};
                return (
                    <div className="d-flex flex-column gap-1">
                        <input type="file" className={`form-control ${css}`} accept={rules.accept || '*'} onChange={(e) => handleChange(field.field_code, e.target.files?.[0])} disabled={disabled} />
                        {val instanceof File && <small className="text-success fw-bold"><i className="pi pi-check-circle me-1" /> {val.name}</small>}
                        {typeof val === 'string' && !isEmptyValue(val) && <small className="text-info"><i className="pi pi-file me-1" /> File Uploaded</small>}
                    </div>
                );
            }
            case 'button': {
                const rules = (typeof field.validation_rule === 'string' ? safeParseJSON(field.validation_rule) : field.validation_rule) || {};
                const actionCode = String(rules.action_code || '').toUpperCase();
                const style = ACTION_BUTTON_STYLES[actionCode] || { bg: '#6b7280', border: '#4b5563' };
                const label = field.custom_label || field.label || actionCode || 'Action';
                return (
                    <button
                        type="button"
                        onClick={() => onActionButton?.(actionCode)}
                        disabled={readOnly || !onActionButton}
                        style={{ backgroundColor: style.bg, borderColor: style.border, color: '#fff', border: '1px solid', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: onActionButton ? 'pointer' : 'default', opacity: (!onActionButton) ? 0.7 : 1 }}
                    >
                        {label}
                    </button>
                );
            }
            default: return <InputText className={css} value={val ?? ''} onChange={(e) => handleChange(field.field_code, e.target.value)} disabled={disabled} placeholder={placeholder} />;
        }
    };

    const addRow = (gId: number, maxRows: number | null) => {
        setAddMoreValues(prev => {
            const current = prev[gId] || [];
            const dynamic = getEffectiveAddMoreConstraint(gId, 'add');
            const enforcedMax =
                dynamic?.mode === 'exact' || dynamic?.mode === 'max'
                    ? Number(dynamic.expectedRows)
                    : null;
            const finalMax = enforcedMax !== null && Number.isFinite(enforcedMax) && enforcedMax > 0
                ? enforcedMax
                : (maxRows && maxRows > 0 ? maxRows : null);
            if (finalMax !== null && current.length >= finalMax) {
                const message =
                    dynamic?.message ||
                    (dynamic?.mode === 'exact'
                        ? `You can add exactly ${finalMax} row(s).`
                        : `You can add maximum ${finalMax} row(s).`);
                setAddMoreGroupErrors((prevErr) => ({ ...prevErr, [gId]: message }));
                return prev;
            }
            setAddMoreGroupErrors((prevErr) => {
                if (!prevErr[gId]) return prevErr;
                const next = { ...prevErr };
                delete next[gId];
                return next;
            });
            return { ...prev, [gId]: [...current, {}] };
        });
    };

    const removeRow = (gId: number, rIdx: number, minRows: number) => {
        setAddMoreValues(prev => {
            const current = prev[gId] || [];
            const dynamic = getEffectiveAddMoreConstraint(gId, 'add');
            const dynamicMin = dynamic?.mode === 'exact' || dynamic?.mode === 'min'
                ? Number(dynamic.expectedRows)
                : null;
            const finalMin = Number.isFinite(Number(dynamicMin))
                ? Number(dynamicMin)
                : Number(minRows);
            if (current.length <= finalMin) {
                const message =
                    dynamic?.message ||
                    (dynamic?.mode === 'exact'
                        ? `At least ${finalMin} row(s) required.`
                        : `Minimum ${finalMin} row(s) required.`);
                setAddMoreGroupErrors((prevErr) => ({ ...prevErr, [gId]: message }));
                return prev;
            }
            setAddMoreGroupErrors((prevErr) => {
                if (!prevErr[gId]) return prevErr;
                const next = { ...prevErr };
                delete next[gId];
                return next;
            });
            return { ...prev, [gId]: current.filter((_, i) => i !== rIdx) };
        });
    };

    const onAddMoreCellChange = (groupId: number, rowIndex: number, column: any, nextValue: any, groupColumns: any[]) => {
        if (readOnly) return;
        const key = column.field_code;
        setAddMoreGroupErrors((prev) => {
            if (!prev[groupId]) return prev;
            const next = { ...prev };
            delete next[groupId];
            return next;
        });

        setAddMoreValues(prev => {
            const rows = [...(prev[groupId] || [])];
            if (!rows[rowIndex]) return prev;

            const updatedRow = { ...rows[rowIndex], [key]: nextValue };

            groupColumns.forEach(childCol => {
                if (childCol.option_config?.parent_builder_field_id === column.builder_field_id) {
                    delete updatedRow[childCol.field_code];
                }
            });

            rows[rowIndex] = updatedRow;
            return { ...prev, [groupId]: rows };
        });
        setTouched(p => new Set(p).add(`${groupId}_${rowIndex}_${key}`));
    };

    const renderAddMoreColumnInput = (groupId: number, rowIndex: number, col: any, rowValues: Record<string, any>, groupColumns: any[]) => {
        const key = col.field_code;
        const value = rowValues[key];
        const disabled = readOnly || col.is_readonly === 'Y';
        const hasErr = touched.has(`${groupId}_${rowIndex}_${key}`) && col.is_required === 'Y' && isEmptyValue(value);
        const css = `w-100 ${hasErr ? 'p-invalid' : ''}`;

        const isCascading = !!col.option_config?.master_table_id;
        if (isCascading) {
            let parentValue = undefined;
            if (col.option_config?.parent_builder_field_id) {
                const parentCodeObj = groupColumns.find(c => c.builder_field_id === col.option_config.parent_builder_field_id);
                if (parentCodeObj) {
                    parentValue = rowValues[parentCodeObj.field_code];
                    if (parentValue === undefined) parentValue = values[parentCodeObj.field_code];
                }
            }

            const isMulti = col.input_type === 'multiselect';
            return (
                <AddMoreDynamicDropdown
                    masterId={col.option_config.master_table_id}
                    parentValue={parentValue}
                    value={value}
                    onChange={(v: any) => onAddMoreCellChange(groupId, rowIndex, col, v, groupColumns)}
                    disabled={disabled}
                    placeholder={col.placeholder || "Select"}
                    className={css}
                    appendTo={appendTo}
                    isMulti={isMulti}
                />
            );
        }

        const rawOpts = safeParseJSON(col.options);
        const opts = Array.isArray(rawOpts)
            ? rawOpts.map((o: any) => ({ label: o?.label ?? o?.name ?? String(o?.value ?? ''), value: String(o?.value ?? '') }))
            : [];
        const inputType = String(col.input_type || 'text').toLowerCase().trim();

        if (col.master_code && (inputType === 'select' || inputType === 'multiselect')) {
            const parentVal = col.parent_field_code ? (rowValues[col.parent_field_code] ?? values[col.parent_field_code]) : undefined;
            return (
                <MasterDropdown
                    masterCode={col.master_code}
                    parentValue={parentVal}
                    value={inputType === 'multiselect' ? (value ?? []) : value}
                    onChange={(v: any) => onAddMoreCellChange(groupId, rowIndex, col, v, groupColumns)}
                    disabled={disabled}
                    placeholder={col.placeholder || 'Select'}
                    className={css}
                    appendTo={appendTo}
                    isMulti={inputType === 'multiselect'}
                />
            );
        }

        switch (inputType) {
            case 'textarea': return <InputTextarea className={css} value={value ?? ''} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.target.value, groupColumns)} disabled={disabled} placeholder={col.placeholder} rows={2} autoResize />;
            case 'number': return <InputNumber className={css} value={typeof value === 'number' ? value : null} onValueChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.value, groupColumns)} disabled={disabled} useGrouping={false} placeholder={col.placeholder} />;
            case 'date': return <Calendar className={css} value={value ? new Date(value) : null} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.value, groupColumns)} disabled={disabled} showIcon placeholder={col.placeholder} />;
            case 'datetime-local': return <Calendar className={css} value={value ? new Date(value) : null} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.value, groupColumns)} disabled={disabled} showIcon showTime placeholder={col.placeholder} />;
            case 'select': return <Dropdown className={css} value={value ? String(value) : null} options={opts} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.value, groupColumns)} disabled={disabled} placeholder={col.placeholder || "Select"} filter appendTo={appendTo} showClear />;
            case 'multiselect': return <MultiSelect className={css} value={value ?? []} options={opts} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.value, groupColumns)} disabled={disabled} placeholder={col.placeholder || "Select"} filter display="chip" appendTo={appendTo} />;
            case 'checkbox': return <Checkbox checked={Boolean(value)} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.checked, groupColumns)} disabled={disabled} />;
            case 'file': {
                const rules = (typeof col.validation_rule === 'string' ? safeParseJSON(col.validation_rule) : col.validation_rule) || {};
                return (
                    <div className="d-flex flex-column gap-1">
                        <input type="file" className={`form-control ${css}`} accept={rules.accept || '*'} onChange={(e) => onAddMoreCellChange(groupId, rowIndex, col, e.target.files?.[0], groupColumns)} disabled={disabled} />
                        {value instanceof File && <small className="text-success fw-bold"><i className="pi pi-check-circle me-1" /> {value.name}</small>}
                    </div>
                );
            }
            default: return <InputText className={css} value={value ?? ''} onChange={e => onAddMoreCellChange(groupId, rowIndex, col, e.target.value, groupColumns)} disabled={disabled} placeholder={col.placeholder} />;
        }
    };

    const renderAddMoreGroup = (group: any, parentFieldLabel: string) => {
        const rows = addMoreValues[group.id] || [];

        let displayLabel = group.label || 'Add Entry';
        if (displayLabel.toLowerCase().includes('add more')) {
            displayLabel = parentFieldLabel || 'Add Entry';
        }

        return (
            // ✅ FIX: Added key={group.id} to satisfy React warning
            <div key={group.id} className="card border border-primary-subtle shadow-sm mt-3 mb-4">
                <div className="card-header bg-primary-subtle bg-opacity-10 d-flex justify-content-between align-items-center py-3">
                    <h6 className="m-0 fw-bold text-primary"><i className="pi pi-list me-2"></i>{displayLabel}</h6>
                    {!readOnly && (
                        <Button type="button" label={`Add ${displayLabel}`} icon="pi pi-plus" size="small" severity="success" outlined onClick={() => addRow(group.id, group.max_rows)} disabled={group.max_rows > 0 ? rows.length >= group.max_rows : false} />
                    )}
                </div>

                <div className="card-body d-flex flex-column gap-4 bg-light">
                    {rows.length === 0 ? <p className="text-muted text-center m-0 py-3">No entries added.</p> : rows.map((row: any, rIdx: number) => (
                        <div key={rIdx} className="bg-white border rounded p-4 position-relative shadow-sm">
                            <div className="d-flex justify-content-between border-bottom pb-2 mb-3">
                                <span className="fw-bold text-secondary text-uppercase" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>Entry #{rIdx + 1}</span>
                                {!readOnly && (
                                    <Button type="button" icon="pi pi-trash" severity="danger" text size="small" onClick={() => removeRow(group.id, rIdx, group.min_rows || 0)} disabled={rows.length <= (group.min_rows || 0)} />
                                )}
                            </div>
                            <div className="row g-4">
                                {group.columns.map((col: any) => {
                                    const cSpan = BOOTSTRAP_SPANS[col.grid_span || 12];
                                    return (
                                        <div key={col.id} className={`col-12 ${cSpan}`}>
                                            <label className="form-label fw-semibold d-flex align-items-center mb-2">
                                                <span className="me-1">{col.label}</span>
                                                {col.is_required === 'Y' && !readOnly && <span className="text-danger me-2">*</span>}
                                                {col.help_text && (
                                                    <>
                                                        <i className="pi pi-question-circle text-primary cursor-pointer ms-1" id={`tt_col_${group.id}_${rIdx}_${col.field_code}`} data-pr-tooltip={col.help_text} data-pr-position="top" style={{ fontSize: '1.1rem' }} />
                                                        <Tooltip target={`#tt_col_${group.id}_${rIdx}_${col.field_code}`} />
                                                    </>
                                                )}
                                            </label>
                                            {renderAddMoreColumnInput(group.id, rIdx, col, row, group.columns)}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAddMoreGroupCompact = (group: any, parentFieldLabel: string) => {
        const rows = addMoreValues[group.id] || [];
        const columns = [...(group.columns || [])].sort((a: any, b: any) => (a.col_order ?? a.preference ?? 0) - (b.col_order ?? b.preference ?? 0));
        const maxRows = typeof group.max_rows === 'number' && group.max_rows > 0 ? group.max_rows : null;
        const minRows = Math.max(1, Number(group.min_rows || 0));
        const dynamic = getEffectiveAddMoreConstraint(group.id, 'add');
        const dynamicMax = dynamic?.mode === 'exact' || dynamic?.mode === 'max' ? Number(dynamic.expectedRows) : null;
        const dynamicMin = dynamic?.mode === 'exact' || dynamic?.mode === 'min' ? Number(dynamic.expectedRows) : null;
        const finalMax = dynamicMax !== null && Number.isFinite(dynamicMax) && dynamicMax > 0 ? dynamicMax : maxRows;
        const finalMin = dynamicMin !== null && Number.isFinite(dynamicMin) ? dynamicMin : minRows;

        let displayLabel = group.label || 'Add Entry';
        if (displayLabel.toLowerCase().includes('add more')) {
            displayLabel = parentFieldLabel || 'Add Entry';
        }

        return (
            <div key={`compact-${group.id}`} className="mt-2 mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <div className="fw-semibold text-dark" style={{ fontSize: '1rem' }}>{displayLabel}</div>
                    <small className="text-muted">
                        Rows mapped: {rows.length}{typeof finalMax === 'number' ? ` / ${finalMax}` : ''}
                    </small>
                </div>

                <div className="border rounded-3 bg-white overflow-auto" style={{ borderColor: '#d9dee7' }}>
                    <table className="table mb-0 align-middle investor-addmore-table" style={{ minWidth: Math.max(720, columns.length * 135) }}>
                        <thead>
                            <tr>
                                {columns.map((col: any) => (
                                    <th key={`h-${group.id}-${col.id}`} className="border-0 fw-semibold" style={{ background: '#f8fafc', color: '#334155', fontSize: '12px', padding: '10px 12px', minWidth: 120 }}>
                                        {col.label}
                                        {col.is_required === 'Y' && !readOnly ? <span className="text-danger ms-1">*</span> : null}
                                    </th>
                                ))}
                                <th className="border-0 fw-semibold text-center" style={{ background: '#f8fafc', color: '#334155', fontSize: '12px', padding: '10px 12px', width: 70 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="text-center text-muted" style={{ padding: '16px 12px' }}>
                                        No rows added.
                                    </td>
                                </tr>
                            ) : rows.map((row: any, rIdx: number) => (
                                <tr key={`r-${group.id}-${rIdx}`}>
                                    {columns.map((col: any) => (
                                        <td key={`c-${group.id}-${rIdx}-${col.id}`} data-label={String(col.label || '')} style={{ padding: 8, verticalAlign: 'top' }}>
                                            {renderAddMoreColumnInput(group.id, rIdx, col, row, columns)}
                                        </td>
                                    ))}
                                    <td className="text-center" data-label="Action" style={{ padding: 8, verticalAlign: 'middle' }}>
                                        {!readOnly && (
                                            <Button
                                                type="button"
                                                icon="pi pi-trash"
                                                text
                                                severity="danger"
                                                onClick={() => removeRow(group.id, rIdx, minRows)}
                                                disabled={rows.length <= finalMin}
                                                style={{ color: rows.length <= finalMin ? '#fecaca' : '#ef4444' }}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!readOnly && (
                    <div className="d-flex align-items-center gap-3 flex-wrap mt-3">
                        <button
                            type="button"
                            onClick={() => addRow(group.id, group.max_rows)}
                            disabled={typeof finalMax === 'number' ? rows.length >= finalMax : false}
                            className="border bg-white rounded-2 px-4 py-2 fw-medium"
                            style={{
                                borderColor: '#efcaca',
                                color: '#ef4444',
                                minWidth: 180,
                                opacity: typeof finalMax === 'number' && rows.length >= finalMax ? 0.6 : 1,
                            }}
                        >
                            <i className="pi pi-plus me-2" />
                            Add {displayLabel}
                        </button>
                        <small className="text-muted">({rows.length}/{finalMax ?? '∞'} rows)</small>
                    </div>
                )}
                {addMoreGroupErrors[group.id] ? (
                    <small className="text-danger d-block mt-2">{addMoreGroupErrors[group.id]}</small>
                ) : null}
            </div>
        );
    };

    const renderField = (field: any) => {
        if ((field?.id && hiddenAddMoreChildFieldIds.ids.has(Number(field.id))) || (field?.field_code && hiddenAddMoreChildFieldIds.codes.has(String(field.field_code)))) {
            return null;
        }
        const visible = computedOverrides[field.field_code]?.visible ?? true;
        if (!visible) return null;
        if (field.input_type === 'addmore') {
            const groups = field.add_more_groups ?? [];
            // ✅ FIX: The mapping is safely outputting renderAddMoreGroup which now has a built-in key
            return (
                <div className="d-flex flex-column gap-3">
                    {groups.length === 0 ? null : groups.map((g: any) => renderAddMoreGroupCompact(g, field.label))}
                </div>
            );
        }

        // Button fields render without a label wrapper
        if (field.input_type === 'button') {
            return <div className="d-flex align-items-end h-100">{renderInput(field)}</div>;
        }

        const required = (computedOverrides[field.field_code]?.required ?? field.is_required === 'Y');
        const inlineDocs = docsForField(String(field.field_code || ''));
        return (
            <div className="d-flex flex-column h-100">
                <div className="mb-2">
                    <label className="form-label fw-semibold text-secondary d-flex align-items-center m-0" style={{ fontSize: '0.95rem' }}>
                        <span className="me-1">{field.label}</span>
                        {required && !readOnly && <span className="text-danger me-2">*</span>}
                        {field.help_text && (
                            <>
                                <i className="pi pi-question-circle text-primary cursor-pointer ms-1" id={`tooltip_${field.id}`} data-pr-tooltip={field.help_text} data-pr-position="top" style={{ fontSize: '1.1rem' }} />
                                <Tooltip target={`#tooltip_${field.id}`} />
                            </>
                        )}
                    </label>
                </div>
                <div className="field-input-with-upload d-flex align-items-stretch flex-grow-1">
                    <div className="field-input-holder flex-grow-1">
                        {renderInput(field)}
                    </div>
                    {inlineDocs.length > 0 && (
                        <div className="d-flex align-items-stretch gap-0 upload-affix-group">
                            {inlineDocs.map((doc: any) => {
                                const isUploading = uploadingDocId === Number(doc.id);
                                const isDisabled = !submissionId || isUploading;
                                const inputId = `inline-upload-${field.id}-${doc.id}`;
                                const allowedExts = normalizeAllowedFormats(doc?.allowedFormats);
                                const acceptAttr = allowedExts.join(',');
                                return (
                                    <div key={`inline-doc-icon-${field.id}-${doc.id}`}>
                                        {!readOnly && (
                                            <>
                                                <input
                                                    id={inputId}
                                                    type="file"
                                                    className="d-none"
                                                    accept={acceptAttr || undefined}
                                                    onChange={(e) => handleInlineDocumentUpload(Number(doc.id), e.target.files?.[0] || null)}
                                                    disabled={isDisabled}
                                                />
                                                <label
                                                    htmlFor={inputId}
                                                    className="d-inline-flex align-items-center justify-content-center border upload-affix-btn"
                                                    style={{
                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        borderColor: '#d9dee7',
                                                        background: isDisabled ? '#f3f4f6' : '#fff5f5',
                                                        color: isDisabled ? '#9ca3af' : '#dc2626',
                                                        opacity: isDisabled ? 0.8 : 1,
                                                        marginBottom: 0,
                                                    }}
                                                    title={isUploading ? 'Uploading...' : 'Upload document'}
                                                >
                                                    <i className={isUploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'} style={{ fontSize: '0.85rem' }} />
                                                </label>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {inlineDocs.length > 0 && (
                    <div className="mt-2 d-flex flex-column gap-1">
                        {inlineDocs.map((doc: any) => {
                            const allowedExts = normalizeAllowedFormats(doc?.allowedFormats);
                            const uploaded = uploadedDocByChecklistId[Number(doc.id)];
                            return (
                                <div key={`inline-doc-meta-${field.id}-${doc.id}`} className="d-flex flex-column align-items-start gap-1">
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <small className={uploaded?.filePath ? 'text-success' : 'text-muted'} style={{ fontSize: '0.72rem' }}>
                                            {doc?.name || `Document ${doc?.id}`}: {uploaded?.filePath ? 'Uploaded' : 'Not uploaded'}
                                        </small>
                                        {allowedExts.length > 0 && (
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                Allowed: {allowedExts.join(', ')}
                                            </small>
                                        )}
                                        {!!uploadErrorByChecklistId[Number(doc.id)] && (
                                            <small className="text-danger" style={{ fontSize: '0.72rem' }}>
                                                {uploadErrorByChecklistId[Number(doc.id)]}
                                            </small>
                                        )}
                                    </div>
                                    {uploaded?.filePath && (
                                        <a
                                            href={resolveFileUrl(uploaded.filePath)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary text-decoration-underline d-inline-flex align-items-center gap-1"
                                            style={{ fontSize: '0.78rem', fontWeight: 600 }}
                                        >
                                            <i className="pi pi-external-link" style={{ fontSize: '0.72rem' }} />
                                            View uploaded file
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {errors[field.field_code] && (touched.has(field.field_code) || touched.has('ALL_PAGE')) && (
                    <small className="text-danger d-block mt-2 fw-medium"><i className="pi pi-exclamation-circle me-1"></i>{errors[field.field_code]}</small>
                )}
            </div>
        );
    };

    const completionPercent = pages.length ? Math.round(((activePageIndex + 1) / pages.length) * 100) : 0;

    return (
        <div className="p-fluid investor-runtime-form">
            <style jsx global>{`
                .investor-runtime-form .form-label {
                    color: #5f6b7a !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                    margin-bottom: 8px !important;
                }
                .investor-runtime-form .p-inputtext,
                .investor-runtime-form .p-inputtextarea,
                .investor-runtime-form .p-inputnumber-input,
                .investor-runtime-form .p-calendar .p-inputtext,
                .investor-runtime-form input.form-control {
                    border: 1px solid #d9dee7 !important;
                    border-radius: 10px !important;
                    background: #ffffff !important;
                    box-shadow: none !important;
                    min-height: 42px;
                }
                .investor-runtime-form .p-inputtextarea {
                    min-height: 92px;
                }
                .investor-runtime-form .p-inputtext,
                .investor-runtime-form .p-inputnumber-input {
                    padding: 10px 12px !important;
                    font-size: 14px !important;
                    color: #111827 !important;
                }
                .investor-runtime-form .field-input-with-upload .field-input-holder .p-inputtext,
                .investor-runtime-form .field-input-with-upload .field-input-holder .p-inputtextarea,
                .investor-runtime-form .field-input-with-upload .field-input-holder .p-inputnumber-input,
                .investor-runtime-form .field-input-with-upload .field-input-holder input.form-control,
                .investor-runtime-form .field-input-with-upload .field-input-holder .p-dropdown,
                .investor-runtime-form .field-input-with-upload .field-input-holder .p-multiselect {
                    border-top-right-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                }
                .investor-runtime-form .upload-affix-group .upload-affix-btn {
                    width: 42px;
                    min-width: 42px;
                    height: 42px;
                    border-left: 0 !important;
                    border-top-right-radius: 10px;
                    border-bottom-right-radius: 10px;
                    border-top-left-radius: 0;
                    border-bottom-left-radius: 0;
                    margin-left: -1px;
                }
                .investor-runtime-form .p-inputtext:hover,
                .investor-runtime-form .p-inputtextarea:hover,
                .investor-runtime-form .p-inputnumber-input:hover {
                    border-color: #c9d2df !important;
                }
                .investor-runtime-form .p-inputtext:enabled:focus,
                .investor-runtime-form .p-inputtextarea:enabled:focus,
                .investor-runtime-form .p-inputnumber-input:enabled:focus {
                    border-color: #f87171 !important;
                    box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15) !important;
                }
                .investor-runtime-form .p-invalid,
                .investor-runtime-form .p-invalid .p-inputtext,
                .investor-runtime-form .p-inputtext.p-invalid {
                    border-color: #ef4444 !important;
                }
                @media (max-width: 767.98px) {
                    .investor-runtime-form .investor-addmore-table {
                        min-width: 100% !important;
                    }
                    .investor-runtime-form .investor-addmore-table thead {
                        display: none;
                    }
                    .investor-runtime-form .investor-addmore-table tbody,
                    .investor-runtime-form .investor-addmore-table tr,
                    .investor-runtime-form .investor-addmore-table td {
                        display: block;
                        width: 100%;
                    }
                    .investor-runtime-form .investor-addmore-table tr {
                        border-bottom: 1px solid #e5e7eb;
                        padding: 8px;
                        background: #fff;
                    }
                    .investor-runtime-form .investor-addmore-table tr:last-child {
                        border-bottom: 0;
                    }
                    .investor-runtime-form .investor-addmore-table td {
                        border: 0 !important;
                        padding: 6px 4px !important;
                        text-align: left !important;
                    }
                    .investor-runtime-form .investor-addmore-table td::before {
                        content: attr(data-label);
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        color: #64748b;
                        margin-bottom: 6px;
                        line-height: 1.2;
                    }
                    .investor-runtime-form .investor-addmore-table td[data-label="Action"] {
                        padding-top: 2px !important;
                    }
                    .investor-runtime-form .investor-addmore-table td[data-label="Action"]::before {
                        margin-bottom: 2px;
                    }
                }
            `}</style>
            <div className="row g-4">
                <div className="col-12 col-lg-3">
                    <div className="rounded-xl p-4" style={{ background: '#FFEFEF' }}>
                        <div className="mb-3 d-flex justify-content-end">
                            <div className="d-flex flex-column align-items-end gap-2 w-100">
                                <span className="text-xs fw-semibold text-secondary">
                                    {completionPercent}% Completed
                                </span>
                                <div className="w-100 rounded-pill overflow-hidden" style={{ height: 8, background: '#e5e7eb' }}>
                                    <div
                                        style={{
                                            width: `${completionPercent}%`,
                                            height: '100%',
                                            background: '#ef4444',
                                            transition: 'width 0.2s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mb-2">
                            <div className="fw-semibold text-dark">Application Pages</div>
                            <small className="text-muted">Select a page to navigate the form</small>
                        </div>
                        {pages.length === 0 ? (
                            <div className="p-3 text-muted bg-white rounded-3 border">No pages configured.</div>
                        ) : (
                            <div>
                                {pages.map((p: any, idx: number) => {
                                    const isCurrent = idx === activePageIndex;
                                    return (
                                        <div key={`page-nav-wrap:${p.id ?? idx}`} className="d-flex">
                                            <div className="d-flex flex-column align-items-center me-3" style={{ width: 36 }}>
                                                <button
                                                    key={`page-nav:${p.id ?? idx}`}
                                                    type="button"
                                                    onClick={() => setActivePageIndex(idx)}
                                                    className="border-0 rounded-pill fw-semibold text-sm"
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        background: isCurrent ? '#ef4444' : '#e5e7eb',
                                                        color: isCurrent ? '#fff' : '#6b7280',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {idx + 1}
                                                </button>
                                                {idx < pages.length - 1 && (
                                                    <div
                                                        style={{
                                                            width: 2,
                                                            height: 26,
                                                            marginTop: 8,
                                                            marginBottom: 8,
                                                            background: '#d3b3b3',
                                                            borderRadius: 999,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setActivePageIndex(idx)}
                                                className="flex-grow-1 text-start border-0 bg-transparent p-0"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div
                                                    className="rounded-3 px-3 py-2 mb-2"
                                                    style={{
                                                        background: isCurrent ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                                        border: isCurrent ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent',
                                                    }}
                                                >
                                                    <div className="fw-semibold" style={{ color: isCurrent ? '#b91c1c' : '#374151', lineHeight: 1.25 }}>
                                                        {p.name || `Page ${idx + 1}`}
                                                    </div>
                                                    <small className="text-muted">Step {idx + 1}</small>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-12 col-lg-9">
                    <div className="border rounded-xl bg-white overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                        <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-start flex-wrap gap-2" style={{ borderColor: '#e5e7eb' }}>
                            <div>
                                <h3 className="m-0 fw-semibold text-dark" style={{ fontSize: '1.25rem' }}>
                                    {activePage?.name || 'Application Form'}
                                </h3>
                                <p className="m-0 mt-1 text-muted" style={{ fontSize: '0.92rem' }}>
                                    Step {pages.length ? activePageIndex + 1 : 0} of {pages.length}
                                </p>
                            </div>
                            <span
                                className="rounded-pill px-3 py-2 fw-semibold"
                                style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    fontSize: '0.82rem',
                                }}
                            >
                                Step {pages.length ? activePageIndex + 1 : 0} of {pages.length}
                            </span>
                        </div>

                        <div className="p-4 p-md-4 d-flex flex-column gap-4">
                            {activePage?.categories?.map((cat: any) => (
                                <div key={cat.id} className="border rounded-lg bg-white" style={{ borderColor: '#e5e7eb' }}>
                                    <div className="p-4">
                                        <h4 className="fw-semibold text-dark border-bottom pb-3 mb-4" style={{ borderColor: '#e5e7eb', fontSize: '1rem' }}>{cat.name}</h4>
                                        <div className="row g-4">
                                            {cat.fields.map((field: any) => (
                                                <div key={field.id} className={field.input_type === 'addmore' ? "col-12 mt-2" : `col-12 ${BOOTSTRAP_SPANS[field.grid_span || 12]}`}>
                                                    {renderField(field)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top" style={{ borderColor: '#e5e7eb' }}>
                <div>
                    {activePageIndex > 0 ? (
                        <button
                            type="button"
                            onClick={() => setActivePageIndex(p => p - 1)}
                            disabled={isSubmitting}
                            className="px-4 py-2 border-0 rounded-lg fw-medium text-sm"
                            style={{ background: '#f3f4f6', color: '#374151', opacity: isSubmitting ? 0.6 : 1 }}
                        >
                            Previous
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 border-0 rounded-lg fw-medium text-sm"
                            style={{ background: '#f3f4f6', color: '#374151', opacity: isSubmitting ? 0.6 : 1 }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={isSubmitting}
                        className="px-4 py-2 border-0 rounded-lg fw-medium text-sm d-flex align-items-center gap-2"
                        style={{
                            background: isLastPage && !readOnly ? '#16a34a' : '#ef4444',
                            color: '#fff',
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <i className="pi pi-spin pi-spinner" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <span>{isLastPage ? (readOnly ? 'Close View' : (finalActionLabel || 'Submit Application')) : 'Save & Next'}</span>
                                {!isLastPage && <i className="pi pi-arrow-right" />}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .p-checkbox .p-checkbox-box,
                .p-radiobutton .p-radiobutton-box {
                    background: #ffffff;
                    border: 1.5px solid #dc2626;
                    box-shadow: none;
                }

                .p-checkbox:not(.p-checkbox-checked) .p-checkbox-box,
                .p-radiobutton:not(.p-radiobutton-checked) .p-radiobutton-box {
                    background: #ffffff;
                    border-color: #dc2626;
                }

                .p-checkbox .p-checkbox-box:hover,
                .p-radiobutton .p-radiobutton-box:hover {
                    border-color: #b91c1c;
                }

                .p-checkbox.p-highlight .p-checkbox-box,
                .p-checkbox-checked .p-checkbox-box,
                .p-radiobutton.p-highlight .p-radiobutton-box,
                .p-radiobutton-checked .p-radiobutton-box {
                    background: #2563eb;
                    border-color: #2563eb;
                }

                .p-checkbox .p-checkbox-box .p-checkbox-icon {
                    color: #ffffff;
                    font-size: 0.72rem;
                }

                .p-radiobutton .p-radiobutton-box .p-radiobutton-icon {
                    background: #ffffff;
                    width: 0.5rem;
                    height: 0.5rem;
                }

                .p-checkbox.p-focus .p-checkbox-box,
                .p-radiobutton.p-focus .p-radiobutton-box {
                    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
                }
            `}</style>
        </div>
    );
}

