import { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { MultiSelect } from 'primereact/multiselect';
import apiClient from '@/lib/api-client';
import { useFormFields } from '@/hooks/master/useFormFields';

const INPUT_TYPES = [
  { label: 'Text Input', value: 'text' },
  { label: 'Select (Dropdown)', value: 'select' },
  { label: 'Multi-Select', value: 'multiselect' },
  { label: 'Number', value: 'number' },
  { label: 'Date Picker', value: 'date' },
  { label: 'Date & Time Picker', value: 'datetime-local' },
  { label: 'Time Picker', value: 'time' },
  { label: 'Email', value: 'email' },
  { label: 'Phone / Mobile', value: 'tel' },
  { label: 'File Upload', value: 'file' },
  { label: 'Radio Button', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Text Area', value: 'textarea' },
  { label: 'Add More (Repeating Group)', value: 'addmore' },
];

const GRID_OPTIONS = [
  { label: 'Full Width (12/12)', value: 12 },
  { label: 'Half Width (6/12)', value: 6 },
  { label: 'One Third (4/12)', value: 4 },
  { label: 'Two Thirds (8/12)', value: 8 },
  { label: 'Quarter (3/12)', value: 3 },
];

const FILE_ACCEPT_OPTIONS = [
  { label: 'PDF (.pdf)', value: '.pdf' },
  { label: 'JPG (.jpg)', value: '.jpg' },
  { label: 'JPEG (.jpeg)', value: '.jpeg' },
  { label: 'PNG (.png)', value: '.png' },
  { label: 'Excel (.xls)', value: '.xls' },
  { label: 'Excel (.xlsx)', value: '.xlsx' },
  { label: 'Word (.doc)', value: '.doc' },
  { label: 'Word (.docx)', value: '.docx' },
  { label: 'CSV (.csv)', value: '.csv' },
];

const RULE_OPERATOR_OPTIONS = [
  { label: 'Contains (In)', value: 'in' },
  { label: 'Not In', value: 'not_in' },
  { label: 'Equals (=)', value: 'equals' },
  { label: 'Not Equals (!=)', value: 'not_equals' },
  { label: 'Is Empty', value: 'is_empty' },
  { label: 'Is Not Empty', value: 'is_not_empty' },
];
const TEXT_API_METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
];

type RuleFieldOption = { label: string; value: string };
type Props = {
  open: boolean;
  row: any;
  locale: string;
  onClose: () => void;
  onSaved: () => void;
  availableRuleFields?: RuleFieldOption[];
  currentRuleFieldCode?: string;
};

const safeParseJson = (input: any) => {
  if (!input) return {};
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  if (typeof input === 'object') return input;
  return {};
};

const parseRuleValueForSave = (operator: string, rawValue: string) => {
  if (operator === 'is_empty' || operator === 'is_not_empty') return '';
  if (operator === 'in' || operator === 'not_in') {
    return rawValue
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return rawValue.trim();
};

const resolveFieldCode = (obj: any): string => {
  return String(
    obj?.field_code ??
      obj?.fieldCode ??
      obj?.formchk_id ??
      obj?.form_check_id ??
      obj?.formCheckId ??
      '',
  ).trim();
};

const normalizeLooseCode = (value: string): string =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/0+/g, '');

const reconcileCodeWithOptions = (
  rawCode: string,
  options: Array<{ value: string; label: string }>,
): string => {
  const code = String(rawCode || '').trim();
  if (!code) return '';
  const exact = options.find((o) => String(o.value) === code);
  if (exact) return exact.value;

  const addZeroBeforeSuffix = code.replace(/_(\d+)$/, '0_$1');
  const byInsertedZero = options.find((o) => String(o.value) === addZeroBeforeSuffix);
  if (byInsertedZero) return byInsertedZero.value;

  const loose = normalizeLooseCode(code);
  if (!loose) return code;
  const looseCandidates = options.filter((o) => normalizeLooseCode(String(o.value)) === loose);
  if (looseCandidates.length === 1) return looseCandidates[0].value;
  if (looseCandidates.length > 1) {
    return looseCandidates.sort(
      (a, b) => Math.abs(String(a.value).length - code.length) - Math.abs(String(b.value).length - code.length),
    )[0].value;
  }

  return code;
};

export function EditInputModal({
  open,
  row,
  locale,
  onClose,
  onSaved,
  availableRuleFields = [],
  currentRuleFieldCode,
}: Props) {
  const editingLang = String(locale || 'en').toLowerCase().startsWith('hi') ? 'HI' : 'EN';
  const [loading, setLoading] = useState(false);
  const { data: allFields = [] } = useFormFields();

  const [formFieldId, setFormFieldId] = useState<number | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [inputType, setInputType] = useState('text');
  const [gridSpan, setGridSpan] = useState(12);
  const [preference, setPreference] = useState(0);
  const [isRequired, setIsRequired] = useState(false);
  const [isReadonly, setIsReadonly] = useState(false);
  const [minLength, setMinLength] = useState<number | null>(null);
  const [maxLength, setMaxLength] = useState<number | null>(null);
  const [regex, setRegex] = useState('');
  const [fileMimeTypes, setFileMimeTypes] = useState<string[]>([]);

  const [enableRequiredAnyOfRule, setEnableRequiredAnyOfRule] = useState(false);
  const [requiredAnyOfFields, setRequiredAnyOfFields] = useState<string[]>([]);
  const [requiredAnyOfWhenField, setRequiredAnyOfWhenField] = useState('');
  const [requiredAnyOfWhenOperator, setRequiredAnyOfWhenOperator] = useState('in');
  const [requiredAnyOfWhenValue, setRequiredAnyOfWhenValue] = useState('');
  const [requiredAnyOfMessage, setRequiredAnyOfMessage] = useState(
    'Please enter at least one value.',
  );
  const [extraAdvancedRules, setExtraAdvancedRules] = useState<any>({});
  const [enableTextApiPrefill, setEnableTextApiPrefill] = useState(false);
  const [textApiUrl, setTextApiUrl] = useState('');
  const [textApiMethod, setTextApiMethod] = useState<'GET' | 'POST'>('GET');
  const [textApiTriggerField, setTextApiTriggerField] = useState('');
  const [textApiResponsePath, setTextApiResponsePath] = useState('');
  const [textApiValueKey, setTextApiValueKey] = useState('');
  const [textApiOverwrite, setTextApiOverwrite] = useState(false);
  const [textApiMappings, setTextApiMappings] = useState<
    Array<{ targetField: string; responsePath: string; valueKey: string }>
  >([]);
  const [extraComponentProps, setExtraComponentProps] = useState<any>({});

  const masterFieldOptions = useMemo(() => {
    return (allFields || []).map((f: any) => ({
      label: `${f.name || f.field_label || 'Unknown'} (${resolveFieldCode(f) || f.id})`,
      value: f.id,
    }));
  }, [allFields]);

  const fieldCodeOptions = useMemo(() => {
    if (Array.isArray(availableRuleFields) && availableRuleFields.length > 0) {
      return availableRuleFields;
    }
    return (allFields || [])
      .map((f: any) => {
        const code = resolveFieldCode(f);
        if (!code) return null;
        return {
          label: `${f.name || f.field_label || 'Unknown'} (${code})`,
          value: code,
        };
      })
      .filter(Boolean) as Array<{ label: string; value: string }>;
  }, [allFields, availableRuleFields]);

  const textApiTriggerOptions = useMemo(() => {
    return [
      { label: '-- No Trigger (Blank) --', value: '' },
      ...fieldCodeOptions,
    ];
  }, [fieldCodeOptions]);

  const currentFieldCode = useMemo(() => {
    const fromProp = String(currentRuleFieldCode || '').trim();
    if (fromProp) return fromProp;
    const fromRow = resolveFieldCode(row);
    if (fromRow) return fromRow;
    const matched = (allFields || []).find(
      (f: any) => Number(f?.id) === Number(row?.form_field_id ?? row?.formFieldId),
    );
    return resolveFieldCode(matched);
  }, [allFields, row, currentRuleFieldCode]);

  const requiredAnyOfPreviewJson = useMemo(() => {
    if (!enableRequiredAnyOfRule) return '';
    const payload = {
      required_any_of: {
        fields: requiredAnyOfFields,
        when: {
          field: requiredAnyOfWhenField,
          operator: requiredAnyOfWhenOperator,
          value: parseRuleValueForSave(requiredAnyOfWhenOperator, requiredAnyOfWhenValue),
        },
        message: requiredAnyOfMessage || 'Please enter at least one value.',
      },
    };
    return JSON.stringify(payload, null, 2);
  }, [
    enableRequiredAnyOfRule,
    requiredAnyOfFields,
    requiredAnyOfWhenField,
    requiredAnyOfWhenOperator,
    requiredAnyOfWhenValue,
    requiredAnyOfMessage,
  ]);

  useEffect(() => {
    if (!open || !row) return;

    setFormFieldId(row.form_field_id);
    setCustomLabel(row.custom_label || '');
    setPlaceholder(row.placeholder || '');
    setHelpText(row.help_text || '');
    setInputType(String(row.input_type || 'text').toLowerCase().trim());
    setGridSpan(row.grid_span || 12);
    setPreference(row.preference || 0);
    setIsRequired(row.is_required === 'Y');
    setIsReadonly(row.is_readonly === 'Y');

    const rules = safeParseJson(row.validation_rule);
    const componentProps = safeParseJson(row.component_props);
    setMinLength(rules.min_length ?? null);
    setMaxLength(rules.max_length ?? null);
    setRegex(rules.regex ?? '');

    const acceptStr = rules.accept ?? '';
    setFileMimeTypes(
      String(acceptStr)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    );

    const extractedRequiredAnyOf =
      rules?.required_any_of || rules?.conditional_any_of || rules?.at_least_one_of;

    if (extractedRequiredAnyOf && typeof extractedRequiredAnyOf === 'object') {
      setEnableRequiredAnyOfRule(true);
      setRequiredAnyOfFields(
        Array.isArray(extractedRequiredAnyOf.fields)
          ? extractedRequiredAnyOf.fields.map((v: any) =>
              reconcileCodeWithOptions(String(v), fieldCodeOptions),
            )
          : [],
      );
      setRequiredAnyOfWhenField(
        reconcileCodeWithOptions(
          String(extractedRequiredAnyOf?.when?.field || currentFieldCode),
          fieldCodeOptions,
        ),
      );
      setRequiredAnyOfWhenOperator(String(extractedRequiredAnyOf?.when?.operator || 'in'));
      const rawWhenValue = extractedRequiredAnyOf?.when?.value;
      setRequiredAnyOfWhenValue(
        Array.isArray(rawWhenValue)
          ? rawWhenValue.map((v: any) => String(v)).join(', ')
          : String(rawWhenValue ?? ''),
      );
      setRequiredAnyOfMessage(
        String(extractedRequiredAnyOf?.message || 'Please enter at least one value.'),
      );
    } else {
      setEnableRequiredAnyOfRule(false);
      setRequiredAnyOfFields([]);
      setRequiredAnyOfWhenField(reconcileCodeWithOptions(currentFieldCode, fieldCodeOptions));
      setRequiredAnyOfWhenOperator('in');
      setRequiredAnyOfWhenValue('');
      setRequiredAnyOfMessage('Please enter at least one value.');
    }

    const preservedRules = { ...rules };
    delete preservedRules.required_any_of;
    delete preservedRules.conditional_any_of;
    delete preservedRules.at_least_one_of;
    setExtraAdvancedRules(preservedRules);

    const textApi =
      componentProps?.textApi ||
      componentProps?.text_api ||
      componentProps?.autoFetch ||
      componentProps?.autofill ||
      componentProps?.prefill ||
      null;
    if (textApi && typeof textApi === 'object') {
      setEnableTextApiPrefill(true);
      setTextApiUrl(String(textApi.apiUrl ?? textApi.api_url ?? ''));
      const method = String(textApi.method ?? 'GET').toUpperCase();
      setTextApiMethod(method === 'POST' ? 'POST' : 'GET');
      setTextApiTriggerField(String(textApi.triggerField ?? textApi.trigger_field ?? ''));
      setTextApiResponsePath(String(textApi.responsePath ?? textApi.response_path ?? ''));
      setTextApiValueKey(String(textApi.valueKey ?? textApi.value_key ?? ''));
      setTextApiOverwrite(Boolean(textApi.overwrite));
      const rawMappings = Array.isArray(textApi.mappings) ? textApi.mappings : [];
      const legacyResponsePath = String(textApi.responsePath ?? textApi.response_path ?? '');
      const legacyValueKey = String(textApi.valueKey ?? textApi.value_key ?? '');
      if (rawMappings.length > 0) {
        setTextApiMappings(
          rawMappings.map((m: any) => ({
            targetField: String(
              m?.targetField ??
                m?.target_field ??
                m?.targetFieldCode ??
                m?.target_field_code ??
                m?.field ??
                '',
            ),
            responsePath: String(m?.responsePath ?? m?.response_path ?? ''),
            valueKey: String(m?.valueKey ?? m?.value_key ?? ''),
          })),
        );
      } else {
        setTextApiMappings(
          legacyValueKey
            ? [
                {
                  targetField: String(currentFieldCode || ''),
                  responsePath: legacyResponsePath,
                  valueKey: legacyValueKey,
                },
              ]
            : [],
        );
      }
    } else {
      setEnableTextApiPrefill(false);
      setTextApiUrl('');
      setTextApiMethod('GET');
      setTextApiTriggerField('');
      setTextApiResponsePath('');
      setTextApiValueKey('');
      setTextApiOverwrite(false);
      setTextApiMappings([]);
    }

    const preservedComponentProps = { ...componentProps };
    delete preservedComponentProps.textApi;
    delete preservedComponentProps.text_api;
    delete preservedComponentProps.autoFetch;
    delete preservedComponentProps.autofill;
    delete preservedComponentProps.prefill;
    setExtraComponentProps(preservedComponentProps);
  }, [open, row, currentFieldCode, fieldCodeOptions]);

  useEffect(() => {
    if (!open || !enableRequiredAnyOfRule) return;
    const available = new Set((fieldCodeOptions || []).map((o) => o.value));
    const reconciledCurrent = reconcileCodeWithOptions(currentFieldCode, fieldCodeOptions);
    if (requiredAnyOfWhenField && available.has(requiredAnyOfWhenField)) return;
    if (reconciledCurrent && available.has(reconciledCurrent)) {
      setRequiredAnyOfWhenField(reconciledCurrent);
    }
  }, [
    open,
    enableRequiredAnyOfRule,
    requiredAnyOfWhenField,
    currentFieldCode,
    fieldCodeOptions,
  ]);

  useEffect(() => {
    if (!open || !enableRequiredAnyOfRule || !Array.isArray(requiredAnyOfFields)) return;
    const reconciled = requiredAnyOfFields
      .map((v) => reconcileCodeWithOptions(String(v), fieldCodeOptions))
      .filter(Boolean);
    const changed =
      reconciled.length !== requiredAnyOfFields.length ||
      reconciled.some((v, i) => v !== requiredAnyOfFields[i]);
    if (changed) setRequiredAnyOfFields(reconciled);
  }, [open, enableRequiredAnyOfRule, requiredAnyOfFields, fieldCodeOptions]);

  const handleSave = async () => {
    if (!row) return;
    setLoading(true);
    try {
      const generatedAdvancedRules: any = {};
      if (enableRequiredAnyOfRule) {
        if (!requiredAnyOfWhenField) {
          alert('Please select "When Field" for Required Any Of rule.');
          setLoading(false);
          return;
        }
        if (!requiredAnyOfFields.length) {
          alert('Please select at least one target field in "Require At Least One Of".');
          setLoading(false);
          return;
        }
        generatedAdvancedRules.required_any_of = {
          fields: requiredAnyOfFields,
          when: {
            field: requiredAnyOfWhenField,
            operator: requiredAnyOfWhenOperator,
            value: parseRuleValueForSave(requiredAnyOfWhenOperator, requiredAnyOfWhenValue),
          },
          message: requiredAnyOfMessage || 'Please enter at least one value.',
        };
      }

      if (enableTextApiPrefill && !String(textApiUrl || '').trim()) {
        alert('Please enter API URL for Text API Prefill.');
        setLoading(false);
        return;
      }
      if (enableTextApiPrefill) {
        const cleanedMappings = textApiMappings.filter(
          (m) => String(m.targetField || '').trim() && String(m.valueKey || '').trim(),
        );
        if (cleanedMappings.length === 0 && !String(textApiValueKey || '').trim()) {
          alert('Please add at least one target mapping (Target Field + Value Key).');
          setLoading(false);
          return;
        }
      }

      const generatedComponentProps: any = { ...extraComponentProps };
      if (enableTextApiPrefill && String(textApiUrl || '').trim()) {
        const cleanedMappings = textApiMappings
          .filter((m) => String(m.targetField || '').trim() && String(m.valueKey || '').trim())
          .map((m) => ({
            targetField: String(m.targetField).trim(),
            targetFieldCode: String(m.targetField).trim(),
            responsePath: String(m.responsePath || '').trim() || null,
            valueKey: String(m.valueKey || '').trim(),
          }));
        generatedComponentProps.textApi = {
          apiUrl: String(textApiUrl).trim(),
          method: textApiMethod,
          triggerField: String(textApiTriggerField || '').trim() || null,
          responsePath: String(textApiResponsePath || '').trim() || null,
          valueKey: String(textApiValueKey || '').trim() || null,
          overwrite: !!textApiOverwrite,
          mappings: cleanedMappings,
        };
      }

      const payload = {
        ...(formFieldId ? { formFieldId } : {}),
        locale,
        customLabel,
        placeholder,
        helpText,
        inputType,
        gridSpan,
        preference,
        isRequired: isRequired ? 'Y' : 'N',
        isReadonly: isReadonly ? 'Y' : 'N',
        validationRule: {
          min_length: minLength,
          max_length: maxLength,
          regex: regex,
          ...extraAdvancedRules,
          ...generatedAdvancedRules,
          accept: fileMimeTypes.join(','),
        },
        componentProps: generatedComponentProps,
      };

      await apiClient.patch(`/master/form-builder/fields/${row.id}`, payload);
      onSaved();
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        (Array.isArray(error?.response?.data?.message)
          ? error.response.data.message.join(', ')
          : null) ||
        error?.message ||
        'Failed to save changes';
      alert(String(message));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="d-flex justify-content-end gap-2 pt-3">
      <Button label="Cancel" severity="secondary" text onClick={onClose} />
      <Button
        label="Save Changes"
        icon="pi pi-check"
        severity="success"
        loading={loading}
        onClick={handleSave}
      />
    </div>
  );

  return (
    <Dialog
      header={
        <div className="d-flex align-items-center gap-2">
          <span>Edit Field Configuration</span>
          <span
            className="badge rounded-pill"
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
          >
            Language being edited: {editingLang}
          </span>
        </div>
      }
      visible={open}
      style={{ width: '700px' }}
      onHide={onClose}
      footer={footer}
      contentStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      <div className="d-flex flex-column gap-4 p-2">
        <div className="border rounded p-3 bg-light shadow-sm">
          <h6 className="fw-bold mb-3 text-primary border-bottom pb-2">1. General Settings</h6>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-bold small">Master Field (Source)</label>
              <Dropdown
                value={formFieldId}
                options={masterFieldOptions}
                onChange={(e) => setFormFieldId(e.value)}
                filter
                className="w-100"
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold small">Custom Label</label>
              <InputText
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="w-100"
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small">Input Type</label>
              <Dropdown
                value={inputType}
                options={INPUT_TYPES}
                onChange={(e) => setInputType(e.value)}
                className="w-100"
                filter
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small">Placeholder</label>
              <InputText
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                className="w-100"
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold small">Help Text / Tooltip</label>
              <InputText
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
                className="w-100"
                placeholder="Shown as a hoverable (?) icon"
              />
            </div>
          </div>
        </div>

        <div className="border rounded p-3 bg-light shadow-sm">
          <h6 className="fw-bold mb-3 text-primary border-bottom pb-2">2. Layout & State</h6>
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label fw-bold small">Grid Width (1-12)</label>
              <Dropdown
                value={gridSpan}
                options={GRID_OPTIONS}
                onChange={(e) => setGridSpan(e.value)}
                className="w-100"
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small">Sort Order</label>
              <InputNumber
                value={preference}
                onValueChange={(e) => setPreference(e.value ?? 0)}
                className="w-100"
              />
            </div>
            <div className="col-12 d-flex gap-4 mt-2">
              <div className="d-flex align-items-center">
                <Checkbox
                  inputId="req"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.checked ?? false)}
                />
                <label htmlFor="req" className="ms-2 cursor-pointer fw-bold text-danger">
                  Required Field
                </label>
              </div>
              <div className="d-flex align-items-center">
                <Checkbox
                  inputId="read"
                  checked={isReadonly}
                  onChange={(e) => setIsReadonly(e.checked ?? false)}
                />
                <label htmlFor="read" className="ms-2 cursor-pointer fw-bold text-muted">
                  Read Only
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded p-3 bg-light shadow-sm">
          <h6 className="fw-bold mb-3 text-primary border-bottom pb-2">3. Advanced & Validation</h6>
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label fw-bold small">Min Length</label>
              <InputNumber
                value={minLength}
                onValueChange={(e) => setMinLength(e.value ?? null)}
                className="w-100"
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold small">Max Length</label>
              <InputNumber
                value={maxLength}
                onValueChange={(e) => setMaxLength(e.value ?? null)}
                className="w-100"
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-bold small">Regex Pattern</label>
              <InputText
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                className="w-100 font-monospace"
              />
            </div>
            {inputType === 'file' && (
              <div className="col-12">
                <label className="form-label fw-bold small text-primary">Allowed File Types</label>
                <MultiSelect
                  value={fileMimeTypes}
                  options={FILE_ACCEPT_OPTIONS}
                  onChange={(e) => setFileMimeTypes(e.value)}
                  className="w-100 p-inputtext-sm"
                  placeholder="Select allowed formats"
                  display="chip"
                />
              </div>
            )}

            {(inputType === 'text' || inputType === 'email' || inputType === 'tel') && (
              <div className="col-12">
                <div className="border rounded p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-bold small text-primary mb-0">
                      Text API Prefill (Optional)
                    </label>
                    <div className="d-flex align-items-center">
                      <Checkbox
                        inputId="enableTextApiPrefill"
                        checked={enableTextApiPrefill}
                        onChange={(e) => setEnableTextApiPrefill(e.checked ?? false)}
                      />
                      <label htmlFor="enableTextApiPrefill" className="ms-2 small">
                        Enable
                      </label>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small fw-bold">API URL</label>
                      <InputText
                        value={textApiUrl}
                        onChange={(e) => setTextApiUrl(e.target.value)}
                        className="w-100"
                        disabled={!enableTextApiPrefill}
                        placeholder="/investor/profile/by-pan?pan={{UK-FCL-00009_0}}"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-bold">Method</label>
                      <Dropdown
                        value={textApiMethod}
                        options={TEXT_API_METHOD_OPTIONS}
                        onChange={(e) => setTextApiMethod(e.value)}
                        className="w-100"
                        disabled={!enableTextApiPrefill}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold">Trigger Field (Optional)</label>
                      <Dropdown
                        value={String(textApiTriggerField ?? '')}
                        options={textApiTriggerOptions}
                        onChange={(e) => setTextApiTriggerField(String(e.value ?? ''))}
                        className="w-100"
                        filter
                        showClear
                        disabled={!enableTextApiPrefill}
                        placeholder="Select field that should trigger API fetch"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">Response Path (Optional)</label>
                      <InputText
                        value={textApiResponsePath}
                        onChange={(e) => setTextApiResponsePath(e.target.value)}
                        className="w-100"
                        disabled={!enableTextApiPrefill}
                        placeholder="data"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">Value Key (Optional)</label>
                      <InputText
                        value={textApiValueKey}
                        onChange={(e) => setTextApiValueKey(e.target.value)}
                        className="w-100"
                        disabled={!enableTextApiPrefill}
                        placeholder="name"
                      />
                    </div>
                    <div className="col-12 d-flex align-items-center">
                      <Checkbox
                        inputId="textApiOverwrite"
                        checked={textApiOverwrite}
                        onChange={(e) => setTextApiOverwrite(e.checked ?? false)}
                        disabled={!enableTextApiPrefill}
                      />
                      <label htmlFor="textApiOverwrite" className="ms-2 small">
                        Overwrite existing user value on each fetch
                      </label>
                    </div>
                    <div className="col-12">
                      <div className="border rounded p-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-bold mb-0">Response Mapping (Multi Target)</label>
                          <Button
                            type="button"
                            label="Add Mapping"
                            icon="pi pi-plus"
                            size="small"
                            text
                            disabled={!enableTextApiPrefill}
                            onClick={() =>
                              setTextApiMappings((prev) => [
                                ...prev,
                                { targetField: '', responsePath: '', valueKey: '' },
                              ])
                            }
                          />
                        </div>
                        <div className="d-flex flex-column gap-2">
                          {textApiMappings.length === 0 ? (
                            <small className="text-muted">
                              Add mappings like: Full Name {'->'} architectName, Mobile {'->'} mobile.
                            </small>
                          ) : (
                            textApiMappings.map((m, idx) => (
                              <div key={`map-${idx}`} className="row g-2 align-items-end">
                                <div className="col-4">
                                  <label className="form-label small">Target Field</label>
                                  <Dropdown
                                    value={m.targetField}
                                    options={fieldCodeOptions}
                                    onChange={(e) =>
                                      setTextApiMappings((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, targetField: String(e.value || '') } : x)),
                                      )
                                    }
                                    className="w-100"
                                    filter
                                    disabled={!enableTextApiPrefill}
                                    placeholder="Select target"
                                  />
                                </div>
                                <div className="col-3">
                                  <label className="form-label small">Response Path</label>
                                  <InputText
                                    value={m.responsePath}
                                    onChange={(e) =>
                                      setTextApiMappings((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, responsePath: e.target.value } : x)),
                                      )
                                    }
                                    disabled={!enableTextApiPrefill}
                                    placeholder="data"
                                  />
                                </div>
                                <div className="col-4">
                                  <label className="form-label small">Value Key</label>
                                  <InputText
                                    value={m.valueKey}
                                    onChange={(e) =>
                                      setTextApiMappings((prev) =>
                                        prev.map((x, i) => (i === idx ? { ...x, valueKey: e.target.value } : x)),
                                      )
                                    }
                                    disabled={!enableTextApiPrefill}
                                    placeholder="architectName"
                                  />
                                </div>
                                <div className="col-1 d-flex justify-content-end">
                                  <Button
                                    type="button"
                                    icon="pi pi-trash"
                                    rounded
                                    text
                                    severity="danger"
                                    disabled={!enableTextApiPrefill}
                                    onClick={() =>
                                      setTextApiMappings((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <small className="text-muted d-block">
                        Token support in URL: <code>{'{{serviceId}}'}</code>,{' '}
                        <code>{'{{submissionId}}'}</code>, or any field code like{' '}
                        <code>{'{{UK-FCL-00009_0}}'}</code>.
                      </small>
                      <small className="text-muted d-block">
                        If Trigger Field is blank, API prefill runs automatically.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="col-12">
              <div className="border rounded p-3 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-bold small text-primary mb-0">
                    Conditional Required Any Of
                  </label>
                  <div className="d-flex align-items-center">
                    <Checkbox
                      inputId="enableRequiredAnyOfRule"
                      checked={enableRequiredAnyOfRule}
                      onChange={(e) => setEnableRequiredAnyOfRule(e.checked ?? false)}
                    />
                    <label htmlFor="enableRequiredAnyOfRule" className="ms-2 small">
                      Enable
                    </label>
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label small fw-bold">When Field</label>
                    <Dropdown
                      value={requiredAnyOfWhenField}
                      options={fieldCodeOptions}
                      onChange={(e) => setRequiredAnyOfWhenField(e.value)}
                      className="w-100"
                      filter={fieldCodeOptions.length > 25}
                      disabled={!enableRequiredAnyOfRule}
                      placeholder="Select trigger field"
                      panelClassName="fb-rule-dd-panel"
                    />
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-bold">Operator</label>
                    <Dropdown
                      value={requiredAnyOfWhenOperator}
                      options={RULE_OPERATOR_OPTIONS}
                      onChange={(e) => setRequiredAnyOfWhenOperator(e.value)}
                      className="w-100"
                      disabled={!enableRequiredAnyOfRule}
                    />
                  </div>
                  <div className="col-8">
                    <label className="form-label small fw-bold">Value</label>
                    <InputText
                      value={requiredAnyOfWhenValue}
                      onChange={(e) => setRequiredAnyOfWhenValue(e.target.value)}
                      className="w-100"
                      disabled={
                        !enableRequiredAnyOfRule ||
                        requiredAnyOfWhenOperator === 'is_empty' ||
                        requiredAnyOfWhenOperator === 'is_not_empty'
                      }
                      placeholder="Example: 1,2"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Require At Least One Of</label>
                    <MultiSelect
                      value={requiredAnyOfFields}
                      options={fieldCodeOptions}
                      onChange={(e) => setRequiredAnyOfFields(e.value)}
                      className="w-100"
                      filter={fieldCodeOptions.length > 25}
                      maxSelectedLabels={2}
                      disabled={!enableRequiredAnyOfRule}
                      placeholder="Select one or more target fields"
                      display="chip"
                      panelClassName="fb-rule-ms-panel"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Validation Message</label>
                    <InputText
                      value={requiredAnyOfMessage}
                      onChange={(e) => setRequiredAnyOfMessage(e.target.value)}
                      className="w-100"
                      disabled={!enableRequiredAnyOfRule}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small text-primary">
                      Generated JSON (Read Only)
                    </label>
                    <textarea
                      value={requiredAnyOfPreviewJson}
                      rows={8}
                      className="form-control font-monospace"
                      readOnly
                      placeholder="Enable rule to preview generated JSON."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .fb-rule-dd-panel,
        .fb-rule-ms-panel {
          max-width: min(680px, calc(100vw - 32px));
        }
      `}</style>
    </Dialog>
  );
}
