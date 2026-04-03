'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { ReusableDataTable } from '@/components/DataTable/ReusableDataTable';
import { ReusableDataTableConfig, RowAction } from '@/components/DataTable/types';
import { DynamicFormField } from '@/components/admin/master/DynamicFormField';
import {
  MasterDataEntryV2,
  MasterDefinitionV2,
  useCreateMasterColumnDefinition,
  useCreateMasterDataEntry,
  useCreateMasterDefinition,
  useDeleteMasterDataEntry,
  useDeleteMasterDefinition,
  useImportMasterDataCsv,
  useMasterDataEntries,
  useMasterDefinitions,
  useUpdateMasterDataEntry,
  useUpdateMasterDefinition,
} from '@/hooks/master/useMasterDataManagementV2';
import {
  MasterColumnDefinition,
  useColumnDefinitions,
} from '@/hooks/master/useColumnDefinitions';
import { useDataTableManager } from '@/hooks/useDataTableManager';

type DefinitionFormState = {
  projectId: number | null;
  name: string;
  code: string;
  description: string;
  icon: string;
  isSystem: boolean;
  allowImport: boolean;
  displayOrder: number;
  isActive: boolean;
};

type RecordFormState = Record<string, unknown>;

type RecordFixedFieldsState = {
  validFrom: string;
  validTo: string;
  sortOrder: number;
  isActive: boolean;
};

type ProjectOption = {
  id: number;
  name: string;
};

type StaticDropdownOption = {
  label: string;
  value: string;
};

type ColumnDataTypeOption = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT';

type ColumnFormState = {
  columnKey: string;
  columnLabel: string;
  dataType: ColumnDataTypeOption;
  isRequired: boolean;
  isSearchable: boolean;
  isListable: boolean;
  fromMasterCode: string | null;
  toMasterCode: string | null;
};

type DefinitionTableRow = MasterDefinitionV2 & {
  projectLabel: string;
  columnCount: number;
  rowCount: number;
};

type RecordTableRow = MasterDataEntryV2 & {
  detailsLabel: string;
  validFromLabel: string;
  validToLabel: string;
  sortOrderValue: number;
};

const TEMP_TENANT_ID = 1;

// Temporary source until the tenant-projects API is finalized.
const mockProjects: ProjectOption[] = [
  { id: 101, name: 'Industrial Approval' },
  { id: 102, name: 'Forest Clearance' },
  { id: 103, name: 'Environmental Certificate' },
];

const FALLBACK_COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia'];

const FALLBACK_STATES: Record<string, string[]> = {
  India: ['West Bengal', 'Maharashtra', 'Karnataka'],
  USA: ['California', 'Texas', 'Florida'],
  UK: ['England', 'Scotland'],
};

const FALLBACK_DISTRICTS: Record<string, string[]> = {
  'West Bengal': ['Kolkata', 'Howrah'],
  Maharashtra: ['Mumbai', 'Pune'],
};

const FALLBACK_BLOCKS: Record<string, string[]> = {
  Kolkata: ['Block A', 'Block B'],
  Howrah: ['Howrah Block 1'],
  Mumbai: ['Andheri', 'Bandra'],
  Pune: ['Pune Block 1'],
};

const FALLBACK_FIELD_LABELS = {
  country: 'Country',
  state: 'State',
  district: 'District',
  block: 'Block/Ward',
} as const;

const FALLBACK_FIELD_RESET_MAP: Record<string, string[]> = {
  country: ['state', 'district', 'block'],
  state: ['district', 'block'],
  district: ['block'],
};

const COLUMN_DATA_TYPE_OPTIONS: Array<{ label: string; value: ColumnDataTypeOption }> = [
  { label: 'TEXT', value: 'TEXT' },
  { label: 'NUMBER', value: 'NUMBER' },
  { label: 'DATE', value: 'DATE' },
  { label: 'SELECT', value: 'SELECT' },
];

const isStateColumn = (column: MasterColumnDefinition) =>
  column.columnKey === 'state_id' || column.columnLabel.trim().toLowerCase() === 'state';

const isDistrictColumn = (column: MasterColumnDefinition) =>
  column.columnKey === 'district_id' || column.columnLabel.trim().toLowerCase() === 'district';

const emptyDefinitionForm = (projectId: number | null = null): DefinitionFormState => ({
  projectId,
  name: '',
  code: '',
  description: '',
  icon: '',
  isSystem: false,
  allowImport: true,
  displayOrder: 0,
  isActive: true,
});

const emptyColumnForm = (): ColumnFormState => ({
  columnKey: '',
  columnLabel: '',
  dataType: 'TEXT',
  isRequired: false,
  isSearchable: false,
  isListable: true,
  fromMasterCode: null,
  toMasterCode: null,
});

const getMasterCodeStem = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

const extractMasterCodeSequence = (code: string) => {
  const match = code.match(/^M_[A-Z0-9]{1,4}(\d{3})$/);
  return match ? Number(match[1]) : null;
};

const normalizeColumnKey = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const buildAutoMasterCode = (
  name: string,
  definitions: MasterDefinitionV2[],
  currentDefinition?: MasterDefinitionV2 | null,
) => {
  const stem = getMasterCodeStem(name);

  if (!stem) {
    return '';
  }

  const prefix = `M_${stem}`;

  if (currentDefinition?.code) {
    const currentSequence = extractMasterCodeSequence(currentDefinition.code);

    if (currentSequence !== null) {
      return `${prefix}${String(currentSequence).padStart(3, '0')}`;
    }
  }

  let maxSequence = 0;

  definitions.forEach((definition) => {
    if (currentDefinition?.id === definition.id) {
      return;
    }

    const sequence = extractMasterCodeSequence(definition.code);

    if (sequence !== null) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  });

  return `${prefix}${String(maxSequence + 1).padStart(3, '0')}`;
};

const parseBoolean = (value?: string | null) => {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  return ['true', '1', 'y', 'yes'].includes(String(value).toLowerCase());
};

const buildEmptyRecordForm = (columns: MasterColumnDefinition[]) =>
  columns.reduce<RecordFormState>((accumulator, column) => {
    if (column.dataType === 'MULTI_SELECT') {
      accumulator[column.columnKey] = [];
    } else if (column.dataType === 'BOOLEAN') {
      accumulator[column.columnKey] = parseBoolean(column.defaultValue);
    } else if (column.dataType === 'NUMBER') {
      accumulator[column.columnKey] =
        column.defaultValue === undefined ||
        column.defaultValue === null ||
        column.defaultValue === ''
          ? null
          : Number(column.defaultValue);
    } else {
      accumulator[column.columnKey] = column.defaultValue ?? '';
    }

    return accumulator;
  }, {});

const buildRecordForm = (
  columns: MasterColumnDefinition[],
  source?: Record<string, unknown>,
) => {
  const initial = buildEmptyRecordForm(columns);

  if (!source) {
    return initial;
  }

  return columns.reduce<RecordFormState>((accumulator, column) => {
    const value = source[column.columnKey];

    if (column.dataType === 'MULTI_SELECT') {
      accumulator[column.columnKey] = Array.isArray(value) ? value : [];
      return accumulator;
    }

    accumulator[column.columnKey] = value ?? accumulator[column.columnKey];
    return accumulator;
  }, initial);
};

const buildFallbackRecordForm = (source?: Record<string, unknown>): RecordFormState => ({
  country: typeof source?.country === 'string' ? source.country : '',
  state: typeof source?.state === 'string' ? source.state : '',
  district: typeof source?.district === 'string' ? source.district : '',
  block: typeof source?.block === 'string' ? source.block : '',
});

const emptyRecordFixedFields = (): RecordFixedFieldsState => ({
  validFrom: '',
  validTo: '',
  sortOrder: 0,
  isActive: true,
});

const isEmptyValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const serializeValue = (value: unknown) => {
  if (value instanceof File) {
    return value.name;
  }

  if (value === undefined || value === '') {
    return null;
  }

  return value;
};

const toDateInputValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const raw = String(value);
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
};

const toNumberValue = (value: unknown, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildRecordFixedFields = (record?: MasterDataEntryV2 | null): RecordFixedFieldsState => {
  const source = record?.data ?? {};

  return {
    validFrom: toDateInputValue(source.valid_from),
    validTo: toDateInputValue(source.valid_to),
    sortOrder: toNumberValue(source.sort_order, 0),
    isActive:
      record?.isActive ??
      (typeof source.is_active === 'boolean' ? source.is_active : true),
  };
};

const formatCellValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const toDropdownOptions = (values: string[]): StaticDropdownOption[] =>
  values.map((value) => ({
    label: value,
    value,
  }));

const getRecordLabel = (
  record: MasterDataEntryV2,
  columns: MasterColumnDefinition[],
) => {
  const preferredKeys = ['name', 'code', 'details'];

  for (const key of preferredKeys) {
    const value = record.data?.[key];
    if (!isEmptyValue(value)) {
      return String(value);
    }
  }

  const firstVisibleColumn = columns.find((column) => column.isListable) ?? columns[0];
  const value = firstVisibleColumn ? record.data?.[firstVisibleColumn.columnKey] : undefined;
  return isEmptyValue(value) ? `Record ${record.id}` : String(value);
};

const getThemeIndex = (value: string) =>
  value.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

const getDefinitionTileStyle = (definition: MasterDefinitionV2) => {
  const themes = [
    { background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d' },
    { background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#1d4ed8' },
    { background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', color: '#6d28d9' },
    { background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', color: '#be185d' },
    { background: 'linear-gradient(135deg, #ffedd5, #fed7aa)', color: '#c2410c' },
  ];

  return themes[getThemeIndex(definition.code || definition.name) % themes.length];
};

const formatIndianCount = (value: number) => new Intl.NumberFormat('en-IN').format(value);

const getScopeLabel = (definition: MasterDefinitionV2) =>
  definition.tenantId ? 'Global' : 'Global';

export const MasterDataManagementV2 = () => {
  const toastRef = useRef<Toast | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const tenantId = TEMP_TENANT_ID;
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [definitionSearch, setDefinitionSearch] = useState('');
  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [columnDialogVisible, setColumnDialogVisible] = useState(false);
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const [editingDefinition, setEditingDefinition] = useState<MasterDefinitionV2 | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterDataEntryV2 | null>(null);
  const [definitionForm, setDefinitionForm] = useState<DefinitionFormState>(
    emptyDefinitionForm(),
  );
  const [columnForm, setColumnForm] = useState<ColumnFormState>(emptyColumnForm());
  const [recordForm, setRecordForm] = useState<RecordFormState>({});
  const [recordFixedFields, setRecordFixedFields] = useState<RecordFixedFieldsState>(
    emptyRecordFixedFields(),
  );

  const { data: allTenantDefinitions = [] } = useMasterDefinitions(tenantId, undefined);
  const { data: projectDefinitions = [] } = useMasterDefinitions(
    tenantId,
    selectedProject ?? undefined,
  );
  const definitions = useMemo(() => projectDefinitions, [projectDefinitions]);
  const filteredDefinitions = useMemo(() => {
    const search = definitionSearch.trim().toLowerCase();

    return definitions.filter((definition) => {
      const matchesTenant =
        selectedTenantFilter === 'all' ||
        selectedTenantFilter === `tenant-${definition.tenantId}`;

      if (!matchesTenant) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [definition.name, definition.code, definition.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [definitionSearch, definitions, selectedTenantFilter]);

  const effectiveDefinitionId =
    selectedDefinitionId &&
    filteredDefinitions.some((definition) => definition.id === selectedDefinitionId)
      ? selectedDefinitionId
      : filteredDefinitions[0]?.id ?? null;

  const selectedProjectOption = useMemo(
    () => mockProjects.find((project) => project.id === selectedProject) || null,
    [selectedProject],
  );
  const selectedDefinition = useMemo(
    () =>
      filteredDefinitions.find((definition) => definition.id === effectiveDefinitionId) ||
      null,
    [filteredDefinitions, effectiveDefinitionId],
  );

  const {
    data: columnDefinitions = [],
    isLoading: isColumnDefinitionsLoading,
  } = useColumnDefinitions(effectiveDefinitionId);
  const { data: records = [] } = useMasterDataEntries(
    effectiveDefinitionId,
    tenantId ?? undefined,
  );

  const createDefinitionMutation = useCreateMasterDefinition();
  const createColumnMutation = useCreateMasterColumnDefinition();
  const updateDefinitionMutation = useUpdateMasterDefinition();
  const deleteDefinitionMutation = useDeleteMasterDefinition();
  const createRecordMutation = useCreateMasterDataEntry();
  const updateRecordMutation = useUpdateMasterDataEntry();
  const deleteRecordMutation = useDeleteMasterDataEntry();
  const importCsvMutation = useImportMasterDataCsv();

  const activeColumns = useMemo(() => {
    if (isColumnDefinitionsLoading || !effectiveDefinitionId) {
      return [];
    }

    return columnDefinitions.filter(
      (column) => !isStateColumn(column) && !isDistrictColumn(column),
    );
  }, [columnDefinitions, effectiveDefinitionId, isColumnDefinitionsLoading]);

  const shouldUseStaticFallbackForm =
    !isColumnDefinitionsLoading && effectiveDefinitionId !== null && columnDefinitions.length === 0;
  const shouldShowAutoMasterNameField =
    !shouldUseStaticFallbackForm && effectiveDefinitionId !== null && activeColumns.length === 0;

  const listableColumns = useMemo(() => {
    const visible = activeColumns.filter((column) => column.isListable);
    return visible.length ? visible : activeColumns;
  }, [activeColumns]);

  const selectedCountry = typeof recordForm.country === 'string' ? recordForm.country : '';
  const selectedState = typeof recordForm.state === 'string' ? recordForm.state : '';
  const selectedDistrict = typeof recordForm.district === 'string' ? recordForm.district : '';

  const countryOptions = useMemo(
    () => toDropdownOptions(FALLBACK_COUNTRIES),
    [],
  );
  const stateOptions = useMemo(
    () => toDropdownOptions(FALLBACK_STATES[selectedCountry] ?? []),
    [selectedCountry],
  );
  const districtOptions = useMemo(
    () => toDropdownOptions(FALLBACK_DISTRICTS[selectedState] ?? []),
    [selectedState],
  );
  const blockOptions = useMemo(
    () =>
      toDropdownOptions(
        FALLBACK_BLOCKS[selectedDistrict] ??
          (selectedDistrict ? [`${selectedDistrict} Block 1`] : []),
      ),
    [selectedDistrict],
  );
  const autoMasterNameValue = editingRecord?.data?.details || selectedDefinition?.name || '';

  const recordPayloadPreview = useMemo(
    () => {
      if (shouldUseStaticFallbackForm) {
        return {
          country: serializeValue(recordForm.country),
          state: serializeValue(recordForm.state),
          district: serializeValue(recordForm.district),
          block: serializeValue(recordForm.block),
        };
      }

      if (shouldShowAutoMasterNameField) {
        return {
          details: autoMasterNameValue || null,
        };
      }

      return activeColumns.reduce<Record<string, unknown>>((accumulator, column) => {
        accumulator[column.columnKey] = serializeValue(recordForm[column.columnKey]);
        return accumulator;
      }, {});
    },
    [activeColumns, autoMasterNameValue, recordForm, shouldShowAutoMasterNameField, shouldUseStaticFallbackForm],
  );

  const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail: string) => {
    toastRef.current?.show({ severity, summary, detail });
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null) {
      const maybeResponse = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      return maybeResponse.response?.data?.message || maybeResponse.message || fallback;
    }

    return fallback;
  };

  const syncDefinitionCode = (
    name: string,
    currentDefinition?: MasterDefinitionV2 | null,
  ) => buildAutoMasterCode(name, allTenantDefinitions, currentDefinition);

  const openDefinitionDialog = (definition?: MasterDefinitionV2 | null) => {
    if (definition) {
      setEditingDefinition(definition);
      setDefinitionForm({
        projectId: definition.projectId ?? selectedProject ?? null,
        name: definition.name,
        code: syncDefinitionCode(definition.name, definition) || definition.code,
        description: definition.description || '',
        icon: definition.icon || '',
        isSystem: definition.isSystem,
        allowImport: definition.allowImport,
        displayOrder: definition.displayOrder,
        isActive: definition.isActive,
      });
    } else {
      setEditingDefinition(null);
      setDefinitionForm(emptyDefinitionForm(selectedProject));
    }

    setDefinitionDialogVisible(true);
  };

  const handleDefinitionNameChange = (name: string) => {
    setDefinitionForm((previous) => ({
      ...previous,
      name,
      code: syncDefinitionCode(name, editingDefinition),
    }));
  };

  const generatedDefinitionCode = definitionForm.name.trim()
    ? syncDefinitionCode(definitionForm.name, editingDefinition) || definitionForm.code
    : definitionForm.code;

  const openColumnDialog = () => {
    if (!selectedDefinition) {
      showToast('warn', 'Definition Required', 'Select a master before adding columns.');
      return;
    }

    setColumnForm(emptyColumnForm());
    setColumnDialogVisible(true);
  };

  const handleColumnFormChange = <K extends keyof ColumnFormState>(
    key: K,
    value: ColumnFormState[K],
  ) => {
    setColumnForm((previous) => {
      const next = {
        ...previous,
        [key]: value,
      };

      if (key === 'dataType' && value !== 'SELECT') {
        next.fromMasterCode = null;
        next.toMasterCode = null;
      }

      if (key === 'fromMasterCode') {
        if (value === previous.toMasterCode) {
          next.toMasterCode = null;
        }
      }

      return next;
    });
  };

  const handleColumnSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedDefinition) {
      showToast('warn', 'Definition Required', 'Select a master before adding columns.');
      return;
    }

    const columnKey = normalizeColumnKey(columnForm.columnKey);
    const columnLabel = columnForm.columnLabel.trim();

    if (!columnKey || !columnLabel) {
      showToast('warn', 'Validation Error', 'Column Key and Column Label are required.');
      return;
    }

    if (
      columnForm.dataType === 'SELECT' &&
      (!columnForm.fromMasterCode ||
        !columnForm.fromMasterCode.trim() ||
        !columnForm.toMasterCode ||
        !columnForm.toMasterCode.trim())
    ) {
      showToast(
        'warn',
        'Validation Error',
        'From Master and To Master are required for SELECT columns.',
      );
      return;
    }

    try {
      await createColumnMutation.mutateAsync({
        masterId: selectedDefinition.id,
        columnKey,
        columnLabel,
        dataType: columnForm.dataType,
        isRequired: columnForm.isRequired,
        isSearchable: columnForm.isSearchable,
        isListable: columnForm.isListable,
        options:
          columnForm.dataType === 'SELECT'
            ? {
                source: 'MASTER',
                master_code: columnForm.toMasterCode,
                from_master_code: columnForm.fromMasterCode,
                to_master_code: columnForm.toMasterCode,
                value_col: 'id',
                label_col: 'name',
              }
            : undefined,
      });

      setColumnDialogVisible(false);
      setColumnForm(emptyColumnForm());
      showToast('success', 'Column Added', 'Column definition created successfully.');
    } catch (error: unknown) {
      showToast('error', 'Column Error', getErrorMessage(error, 'Unable to save column.'));
    }
  };

  const openRecordDialog = (record?: MasterDataEntryV2 | null) => {
    if (!selectedDefinition) {
      showToast('warn', 'Definition Required', 'Select a master before adding data.');
      return;
    }

    if (record) {
      setEditingRecord(record);
      setRecordForm(
        shouldUseStaticFallbackForm
          ? buildFallbackRecordForm(record.data)
          : buildRecordForm(activeColumns, record.data),
      );
      setRecordFixedFields(buildRecordFixedFields(record));
    } else {
      setEditingRecord(null);
      setRecordForm(
        shouldUseStaticFallbackForm
          ? buildFallbackRecordForm()
          : buildEmptyRecordForm(activeColumns),
      );
      setRecordFixedFields(emptyRecordFixedFields());
    }

    setRecordDialogVisible(true);
  };

  const handleRecordFieldChange = (key: string, value: unknown) => {
    setRecordForm((previous) => {
      const next = {
        ...previous,
        [key]: value,
      };

      if (shouldUseStaticFallbackForm) {
        for (const dependentKey of FALLBACK_FIELD_RESET_MAP[key] ?? []) {
          next[dependentKey] = '';
        }
      }

      return next;
    });
  };

  const handleRecordFixedFieldChange = (
    key: keyof RecordFixedFieldsState,
    value: string | number | boolean,
  ) => {
    setRecordFixedFields((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleDefinitionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const activeProjectId = definitionForm.projectId ?? selectedProject;
    const generatedCode = generatedDefinitionCode;

    if (!activeProjectId) {
      showToast('warn', 'Project Required', 'Select a project before saving a master.');
      return;
    }

    if (!generatedCode) {
      showToast('warn', 'Code Required', 'Enter a master name to generate the master code.');
      return;
    }

    try {
      const payload = {
        tenantId,
        projectId: activeProjectId,
        name: definitionForm.name,
        code: generatedCode,
        description: definitionForm.description || undefined,
        icon: definitionForm.icon || undefined,
        isSystem: definitionForm.isSystem,
        allowImport: definitionForm.allowImport,
        displayOrder: definitionForm.displayOrder || 0,
        isActive: definitionForm.isActive,
      };

      if (editingDefinition) {
        await updateDefinitionMutation.mutateAsync({
          id: editingDefinition.id,
          data: payload,
        });
        showToast('success', 'Master Updated', 'Master definition updated successfully.');
      } else {
        const created = await createDefinitionMutation.mutateAsync(payload);
        setSelectedProject(activeProjectId);
        setSelectedDefinitionId(created.id);
        showToast('success', 'Master Created', 'Master definition created successfully.');
      }

      setDefinitionDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Master Error', getErrorMessage(error, 'Unable to save master.'));
    }
  };

  const handleRecordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const activeProjectId = selectedDefinition?.projectId ?? selectedProject;

    if (!effectiveDefinitionId || !activeProjectId) {
      showToast('warn', 'Context Required', 'Select a project and master before saving data.');
      return;
    }

    if (shouldUseStaticFallbackForm) {
      for (const [key, label] of Object.entries(FALLBACK_FIELD_LABELS)) {
        if (isEmptyValue(recordForm[key])) {
          showToast('warn', 'Validation Error', `${label} is required.`);
          return;
        }
      }
    } else {
      for (const column of activeColumns) {
        if (column.isRequired && isEmptyValue(recordForm[column.columnKey])) {
          showToast('warn', 'Validation Error', `${column.columnLabel} is required.`);
          return;
        }

        if (column.dataType === 'NUMBER' && recordForm[column.columnKey] === '') {
          showToast('warn', 'Validation Error', `${column.columnLabel} must be a number.`);
          return;
        }
      }
    }

    if (
      recordFixedFields.validFrom &&
      recordFixedFields.validTo &&
      new Date(recordFixedFields.validFrom) > new Date(recordFixedFields.validTo)
    ) {
      showToast('warn', 'Validation Error', 'Valid From cannot be later than Valid To.');
      return;
    }

    try {
      const payload = {
        master_id: effectiveDefinitionId,
        tenant_id: tenantId,
        data: recordPayloadPreview,
        valid_from: recordFixedFields.validFrom || undefined,
        valid_to: recordFixedFields.validTo || undefined,
        sort_order: recordFixedFields.sortOrder ?? 0,
        is_active: recordFixedFields.isActive,
      };

      console.log('Master data payload', payload);

      if (editingRecord) {
        await updateRecordMutation.mutateAsync({
          id: editingRecord.id,
          masterId: effectiveDefinitionId,
          data: {
            projectId: activeProjectId,
            data: payload.data,
            valid_from: payload.valid_from,
            valid_to: payload.valid_to,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
            isActive: payload.is_active,
          },
        });
      } else {
        await createRecordMutation.mutateAsync({
          masterId: payload.master_id,
          tenantId: payload.tenant_id,
          projectId: activeProjectId,
          data: payload.data,
          valid_from: payload.valid_from,
          valid_to: payload.valid_to,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
          isActive: payload.is_active,
        });
      }

      showToast(
        'success',
        editingRecord ? 'Data Updated' : 'Data Created',
        editingRecord
          ? 'Master data updated successfully.'
          : 'Master data created successfully.',
      );

      setRecordDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Data Error', getErrorMessage(error, 'Unable to save master data.'));
    }
  };

  const handleCsvFileSelected = async (file?: File | null) => {
    const activeProjectId = selectedDefinition?.projectId ?? selectedProject;

    if (!file || !effectiveDefinitionId || !activeProjectId) {
      return;
    }

    try {
      const result = await importCsvMutation.mutateAsync({
        masterId: effectiveDefinitionId,
        tenantId,
        projectId: activeProjectId,
        file,
      });

      showToast(
        result.failed > 0 ? 'warn' : 'success',
        'CSV Import Complete',
        `${result.success} row(s) imported, ${result.failed} failed.`,
      );
    } catch (error: unknown) {
      showToast('error', 'CSV Import Error', getErrorMessage(error, 'Unable to import CSV.'));
    }
  };

  const tenantFilterOptions = [
    { label: 'All Tenants', value: 'all' },
    { label: `Tenant ${tenantId}`, value: `tenant-${tenantId}` },
  ];

  const dialogProjectName =
    mockProjects.find((project) => project.id === (definitionForm.projectId ?? selectedProject))
      ?.name ?? 'Not selected';

  const selectedDefinitionProjectName =
    selectedDefinition?.project?.name ??
    mockProjects.find((project) => project.id === selectedDefinition?.projectId)?.name ??
    'No type assigned';

  const selectedDefinitionColumnCount =
    selectedDefinition && selectedDefinition.id === effectiveDefinitionId
      ? columnDefinitions.length
      : selectedDefinition?.columnDefinitions?.length ?? 0;
  const selectedDefinitionRowCount = selectedDefinition?._count?.masterData ?? records.length;
  const fromMasterOptions = allTenantDefinitions
    .map((definition) => ({
      label: `${definition.name} (${definition.code})`,
      value: definition.code,
    }));
  const toMasterOptions = allTenantDefinitions
    .filter((definition) => definition.code !== columnForm.fromMasterCode)
    .map((definition) => ({
      label: `${definition.name} (${definition.code})`,
      value: definition.code,
    }));

  const handleDefinitionRowClick = (definitionId: number) => {
    setSelectedDefinitionId(definitionId);

    if (typeof document !== 'undefined') {
      window.setTimeout(() => {
        document
          .getElementById('master-definition-detail')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const definitionRows = useMemo<DefinitionTableRow[]>(
    () =>
      filteredDefinitions.map((definition) => ({
        ...definition,
        projectLabel:
          definition.project?.name ??
          mockProjects.find((project) => project.id === definition.projectId)?.name ??
          'No project',
        columnCount:
          definition.id === effectiveDefinitionId
            ? columnDefinitions.length
            : definition.columnDefinitions?.length ?? 0,
        rowCount: definition._count?.masterData ?? 0,
      })),
    [filteredDefinitions, effectiveDefinitionId, columnDefinitions],
  );

  const recordRows = useMemo<RecordTableRow[]>(
    () =>
      records.map((record) => ({
        ...record,
        detailsLabel: getRecordLabel(record, activeColumns) || selectedDefinition?.name || '-',
        validFromLabel: toDateInputValue(record.data?.valid_from),
        validToLabel: toDateInputValue(record.data?.valid_to),
        sortOrderValue: toNumberValue(record.data?.sort_order, 0),
      })),
    [records, activeColumns, selectedDefinition],
  );

  const {
    data: definitionTableData,
    selectedRows: selectedDefinitionRows,
    filters: definitionTableFilters,
    globalFilter: definitionTableGlobalFilter,
    handleSelectionChange: handleDefinitionSelectionChange,
    handleGlobalFilterChange: handleDefinitionGlobalFilterChange,
    handleFiltersChange: handleDefinitionFiltersChange,
    clearFilters: clearDefinitionTableFilters,
  } = useDataTableManager<DefinitionTableRow>(definitionRows);

  const {
    data: recordTableData,
    selectedRows: selectedRecordRows,
    filters: recordTableFilters,
    globalFilter: recordTableGlobalFilter,
    handleSelectionChange: handleRecordSelectionChange,
    handleGlobalFilterChange: handleRecordGlobalFilterChange,
    handleFiltersChange: handleRecordFiltersChange,
    clearFilters: clearRecordTableFilters,
  } = useDataTableManager<RecordTableRow>(recordRows);

  const definitionTableConfig = useMemo<ReusableDataTableConfig<DefinitionTableRow>>(
    () => ({
      columns: [
        { field: 'id', header: 'ID', width: '6%', filterType: 'none' },
        {
          field: 'name',
          header: 'Master Name',
          width: '22%',
          filterType: 'text',
          body: (row) => <span className="font-semibold">{row.name}</span>,
        },
        {
          field: 'code',
          header: 'Code',
          width: '12%',
          filterType: 'text',
          body: (row) => <span className="badge bg-info">{row.code}</span>,
        },
        { field: 'projectLabel', header: 'Project', width: '18%', filterType: 'text' },
        { field: 'columnCount', header: 'Columns', width: '10%', filterType: 'number' },
        {
          field: 'rowCount',
          header: 'Data Rows',
          width: '10%',
          filterType: 'number',
          body: (row) => formatIndianCount(row.rowCount),
        },
        {
          field: 'isActive',
          header: 'Status',
          width: '10%',
          filterType: 'select',
          filterOptions: [
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ],
          body: (row) => (
            <Tag
              value={row.isActive ? 'Active' : 'Inactive'}
              severity={row.isActive ? 'success' : 'danger'}
            />
          ),
        },
        {
          field: 'createdAt',
          header: 'Created Date',
          width: '12%',
          filterType: 'date',
          body: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
      ],
      dataKey: 'id',
      rows: 10,
      rowsPerPageOptions: [5, 10, 25, 50],
      globalFilterFields: ['name', 'code', 'description', 'projectLabel'],
      selectable: true,
      selectionMode: 'multiple',
      paginator: true,
      stripedRows: true,
      showGridlines: true,
      emptyMessage: 'No master definitions found.',
    }),
    [],
  );

  const recordTableConfig = useMemo<ReusableDataTableConfig<RecordTableRow>>(
    () => ({
      columns: [
        ...(listableColumns.length
          ? listableColumns.map((column) => ({
              field: `data.${column.columnKey}`,
              header: column.columnLabel,
              width: '18%',
              filterType:
                column.dataType === 'NUMBER'
                  ? 'number'
                  : column.dataType === 'DATE'
                    ? 'date'
                    : 'text',
              body: (row: RecordTableRow) => formatCellValue(row.data?.[column.columnKey]),
            }))
          : [
              {
                field: 'detailsLabel',
                header: 'Details',
                width: '28%',
                filterType: 'text',
                body: (row: RecordTableRow) => (
                  <span className="font-semibold">{formatCellValue(row.detailsLabel)}</span>
                ),
              },
            ]),
        {
          field: 'validFromLabel',
          header: 'Valid From',
          width: '12%',
          filterType: 'date',
          body: (row) => formatCellValue(row.validFromLabel),
        },
        {
          field: 'validToLabel',
          header: 'Valid To',
          width: '12%',
          filterType: 'date',
          body: (row) => formatCellValue(row.validToLabel),
        },
        {
          field: 'sortOrderValue',
          header: 'Sort Order',
          width: '10%',
          filterType: 'number',
        },
        {
          field: 'isActive',
          header: 'Status',
          width: '10%',
          filterType: 'select',
          filterOptions: [
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ],
          body: (row) => (
            <Tag
              value={row.isActive ? 'Active' : 'Inactive'}
              severity={row.isActive ? 'success' : 'danger'}
            />
          ),
        },
        {
          field: 'createdAt',
          header: 'Created Date',
          width: '12%',
          filterType: 'date',
          body: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
      ],
      dataKey: 'id',
      rows: 10,
      rowsPerPageOptions: [5, 10, 25, 50],
      globalFilterFields: listableColumns.length
        ? listableColumns.map((column) => `data.${column.columnKey}`)
        : ['detailsLabel'],
      selectable: true,
      selectionMode: 'multiple',
      paginator: true,
      stripedRows: true,
      showGridlines: true,
      emptyMessage: 'No data rows yet. Add a record to start saving master data.',
    }),
    [listableColumns],
  );

  const definitionRowActions = useMemo<RowAction<DefinitionTableRow>[]>(
    () => [
      {
        icon: 'pi pi-arrow-right',
        label: 'Open',
        severity: 'secondary',
        onClick: (definition) => handleDefinitionRowClick(definition.id),
        tooltip: 'Open workspace',
      },
      {
        icon: 'pi pi-pencil',
        label: 'Edit',
        severity: 'info',
        onClick: (definition) => openDefinitionDialog(definition),
        tooltip: 'Edit',
      },
      {
        icon: 'pi pi-trash',
        label: 'Delete',
        severity: 'error',
        visible: (definition) => !definition.isSystem,
        onClick: async (definition) => {
          if (!confirm(`Delete master "${definition.name}" and all its data?`)) {
            return;
          }

          await deleteDefinitionMutation.mutateAsync(definition.id);
          showToast('success', 'Master Deleted', 'Master definition deleted successfully.');
        },
        tooltip: 'Delete',
      },
    ],
    [deleteDefinitionMutation],
  );

  const recordRowActions = useMemo<RowAction<RecordTableRow>[]>(
    () => [
      {
        icon: 'pi pi-pencil',
        label: 'Edit',
        severity: 'info',
        onClick: (record) => openRecordDialog(record),
        tooltip: 'Edit',
      },
      {
        icon: 'pi pi-trash',
        label: 'Delete',
        severity: 'error',
        onClick: async (record) => {
          if (
            !confirm(
              `Delete "${getRecordLabel(record, activeColumns)}" from ${selectedDefinition?.name}?`,
            )
          ) {
            return;
          }

          await deleteRecordMutation.mutateAsync({
            id: record.id,
            masterId: selectedDefinition!.id,
          });
          showToast('success', 'Data Deleted', 'Master data deleted successfully.');
        },
        tooltip: 'Delete',
      },
    ],
    [activeColumns, deleteRecordMutation, selectedDefinition],
  );

  const clearDefinitionFilters = () => {
    clearDefinitionTableFilters();
    handleDefinitionGlobalFilterChange('');
    handleDefinitionFiltersChange({});
    setSelectedTenantFilter('all');
    setSelectedProject(null);
  };

  const clearRecordFilters = () => {
    clearRecordTableFilters();
    handleRecordGlobalFilterChange('');
    handleRecordFiltersChange({});
  };

  const definitionLeftToolbarTemplate = () => (
    <Button
      label="Add Master"
      icon="pi pi-plus"
      severity="success"
      onClick={() => openDefinitionDialog()}
    />
  );

  const definitionRightToolbarTemplate = () => (
    <div className="d-flex gap-2 flex-wrap">
      <Button
        label="Clear Filters"
        icon="pi pi-filter-slash"
        severity="secondary"
        outlined
        onClick={clearDefinitionFilters}
      />
      <Button
        label="CSV"
        icon="pi pi-upload"
        severity="info"
        rounded
        onClick={() => csvInputRef.current?.click()}
        disabled={
          !effectiveDefinitionId ||
          !selectedDefinition?.allowImport ||
          importCsvMutation.isPending
        }
      />
      <Button
        label="Add Data"
        icon="pi pi-plus"
        severity="success"
        rounded
        onClick={() => openRecordDialog()}
        disabled={!selectedDefinition}
      />
      <Button
        label="Add Column"
        icon="pi pi-table"
        severity="warning"
        rounded
        onClick={openColumnDialog}
        disabled={!selectedDefinition}
      />
    </div>
  );

  return (
    <div className="p-4" style={{ background: '#f6f8ff', minHeight: '100%' }}>
      <Toast ref={toastRef} />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        className="d-none"
        onChange={(event) => {
          const file = event.target.files?.[0];
          handleCsvFileSelected(file);
          event.currentTarget.value = '';
        }}
      />

      <div className="mb-4">
        <h1 className="h2 mb-3">Master Data Management</h1>
        <Toolbar left={definitionLeftToolbarTemplate} right={definitionRightToolbarTemplate} className="mb-3" />
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-3">
              <label className="form-label">Tenant</label>
              <Dropdown
                value={selectedTenantFilter}
                onChange={(event) => setSelectedTenantFilter(event.value)}
                options={tenantFilterOptions}
                placeholder="All Tenants"
                className="w-100"
              />
            </div>
            <div className="col-lg-3">
              <label className="form-label">Project</label>
              <Dropdown
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.value ?? null)}
                options={mockProjects}
                optionLabel="name"
                optionValue="id"
                placeholder="All Projects"
                className="w-100"
                showClear
                filter
              />
            </div>
            <div className="col-lg-6">
              <div className="text-muted small">
                {selectedProjectOption
                  ? `Showing ${selectedProjectOption.name} masters for tenant ${tenantId}.`
                  : `Showing all masters for tenant ${tenantId}.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReusableDataTable<DefinitionTableRow>
        data={definitionTableData}
        config={definitionTableConfig}
        loading={false}
        selectedRows={selectedDefinitionRows}
        onSelectionChange={handleDefinitionSelectionChange}
        onGlobalFilterChange={handleDefinitionGlobalFilterChange}
        onFiltersChange={handleDefinitionFiltersChange}
        rowActions={definitionRowActions}
        externalFilters={definitionTableFilters}
        externalGlobalFilter={definitionTableGlobalFilter}
      />

      <div className="mt-5" id="master-definition-detail">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap">
          <div>
            <h2 className="h3 mb-1">
              {selectedDefinition?.name || 'Master Workspace'}
            </h2>
            <div className="text-muted small">
              {selectedDefinition
                ? `${selectedDefinition.code} • ${selectedDefinitionProjectName}`
                : 'Select a master definition above to manage its rows and columns.'}
            </div>
          </div>

          {selectedDefinition ? (
            <div className="d-flex gap-2 flex-wrap">
              <Button
                label="Edit Master"
                icon="pi pi-pencil"
                severity="info"
                onClick={() => openDefinitionDialog(selectedDefinition)}
              />
              <Button
                label="Clear Filters"
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                onClick={clearRecordFilters}
              />
            </div>
          ) : null}
        </div>

        {selectedDefinition ? (
          <>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Tag value={`${selectedDefinitionColumnCount} Columns`} severity="info" />
              <Tag value={`${formatIndianCount(selectedDefinitionRowCount)} Rows`} severity="contrast" />
              <Tag
                value={selectedDefinition.allowImport ? 'Import Allowed' : 'Import Blocked'}
                severity={selectedDefinition.allowImport ? 'success' : 'danger'}
              />
              <Tag
                value={selectedDefinition.isActive ? 'Active' : 'Inactive'}
                severity={selectedDefinition.isActive ? 'success' : 'danger'}
              />
            </div>

            {activeColumns.length ? (
              <div className="mb-3 d-flex flex-wrap gap-2">
                {activeColumns.map((column) => (
                  <Tag
                    key={column.id}
                    value={`${column.columnLabel} (${column.columnKey})`}
                    severity={column.isRequired ? 'warning' : 'info'}
                  />
                ))}
              </div>
            ) : (
              <div className="alert alert-info">
                No <code>master_column_definition</code> rows are configured for this master yet.
                Add Data will use the fallback Country/State/District/Block form.
              </div>
            )}

            <ReusableDataTable<RecordTableRow>
              data={recordTableData}
              config={recordTableConfig}
              loading={false}
              selectedRows={selectedRecordRows}
              onSelectionChange={handleRecordSelectionChange}
              onGlobalFilterChange={handleRecordGlobalFilterChange}
              onFiltersChange={handleRecordFiltersChange}
              rowActions={recordRowActions}
              externalFilters={recordTableFilters}
              externalGlobalFilter={recordTableGlobalFilter}
            />
          </>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-muted">
              Choose a master from the table above to manage columns and data rows.
            </div>
          </div>
        )}
      </div>

      {false && (

      <div
        className="card border-0 shadow-sm overflow-hidden mb-4"
        style={{ borderRadius: '24px' }}
      >
        <div className="border-bottom bg-white px-4 py-3 d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <div>
            <h1 className="h4 mb-1 fw-semibold" style={{ color: '#111827' }}>
              Master Definition
            </h1>
            <div className="text-muted small">
              Define containers first, then manage columns and data from one place.
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Button
              label="Import CSV"
              icon="pi pi-upload"
              outlined
              onClick={() => csvInputRef.current?.click()}
              disabled={
                !effectiveDefinitionId ||
                !selectedDefinition?.allowImport ||
                importCsvMutation.isPending
              }
              style={{ borderRadius: '14px' }}
            />
            <Button
              label="New Master"
              icon="pi pi-plus"
              onClick={() => openDefinitionDialog()}
              style={{
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              }}
            />
          </div>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="d-none"
            onChange={(event) => {
              const file = event.target.files?.[0];
              handleCsvFileSelected(file);
              event.currentTarget.value = '';
            }}
          />
        </div>

        <div className="p-4">
          {false && (
          <div
            className="rounded-4 px-3 py-3 mb-4 d-flex justify-content-between align-items-center gap-3 flex-wrap"
            style={{
              background:
                'linear-gradient(135deg, rgba(124, 58, 237, 0.10), rgba(99, 102, 241, 0.04))',
              border: '1px solid rgba(139, 92, 246, 0.12)',
            }}
          >
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <i className="pi pi-info-circle" style={{ color: '#db2777' }} />
              <span className="fw-semibold" style={{ color: '#6d28d9' }}>
                Step 1 of 4 — Pehle master ka container define karo, phir columns aur data
              </span>
            </div>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-underline"
              style={{ color: '#6d28d9' }}
              onClick={() => {
                if (selectedDefinition) {
                  handleDefinitionRowClick(selectedDefinition.id);
                } else {
                  openDefinitionDialog();
                }
              }}
            >
              Next: Column Definition →
            </button>
          </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-lg-4">
              <div className="position-relative">
                <i
                  className="pi pi-search position-absolute top-50 translate-middle-y"
                  style={{ left: '1rem', color: '#60a5fa' }}
                />
                <InputText
                  value={definitionSearch}
                  onChange={(event) => setDefinitionSearch(event.target.value)}
                  placeholder="Search by name or code..."
                  className="w-100"
                  style={{
                    paddingLeft: '2.75rem',
                    borderRadius: '14px',
                    minHeight: '3.1rem',
                  }}
                />
              </div>
            </div>
            <div className="col-lg-3">
              <Dropdown
                value={selectedTenantFilter}
                onChange={(event) => setSelectedTenantFilter(event.value)}
                options={tenantFilterOptions}
                placeholder="All Tenants"
                className="w-100"
                style={{ minHeight: '3.1rem' }}
              />
            </div>
            <div className="col-lg-3">
              <Dropdown
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.value ?? null)}
                options={mockProjects}
                optionLabel="name"
                optionValue="id"
                placeholder="All Types"
                className="w-100"
                style={{ minHeight: '3.1rem' }}
                showClear
              />
            </div>
          </div>

          <div
            className="card border-0 shadow-sm overflow-hidden"
            style={{ borderRadius: '18px' }}
          >
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr className="text-uppercase small text-muted">
                    <th className="border-0 px-4 py-3">Master</th>
                    <th className="border-0 px-3 py-3">Code</th>
                    <th className="border-0 px-3 py-3">Scope</th>
                    <th className="border-0 px-3 py-3">Columns</th>
                    <th className="border-0 px-3 py-3">Data Rows</th>
                    <th className="border-0 px-3 py-3">Import</th>
                    <th className="border-0 px-3 py-3">Status</th>
                    <th className="border-0 px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefinitions.map((definition) => {
                    const tileStyle = getDefinitionTileStyle(definition);
                    const rowCount = definition._count?.masterData ?? 0;
                    const columnCount = definition.columnDefinitions?.length ?? 0;
                    const isSelected = effectiveDefinitionId === definition.id;

                    return (
                      <tr
                        key={definition.id}
                        onClick={() => handleDefinitionRowClick(definition.id)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(139, 92, 246, 0.06)' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="d-inline-flex align-items-center justify-content-center"
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '14px',
                                background: tileStyle.background,
                                color: tileStyle.color,
                                fontSize: '1.1rem',
                                flexShrink: 0,
                              }}
                            >
                              {definition.icon ? (
                                <i className={definition.icon} />
                              ) : (
                                <span className="fw-semibold">
                                  {(definition.name || definition.code).slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="fw-semibold d-flex align-items-center gap-2">
                                <span>{definition.name}</span>
                                {definition.isSystem ? <i className="pi pi-lock text-warning" /> : null}
                              </div>
                              <div className="small text-uppercase text-muted">{definition.code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{ background: '#f1f5f9', color: '#475569' }}
                          >
                            {definition.code}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
                            style={{ background: '#ecfeff', color: '#0f766e' }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '999px',
                                background: '#67e8f9',
                              }}
                            />
                            {getScopeLabel(definition)}
                          </span>
                        </td>
                        <td className="px-3 py-3 fw-semibold" style={{ color: '#7c3aed' }}>
                          {columnCount} columns
                        </td>
                        <td className="px-3 py-3">
                          <span className="fw-semibold" style={{ color: '#8b5cf6' }}>
                            {formatIndianCount(rowCount)}
                          </span>{' '}
                          rows
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              background: definition.allowImport ? '#dcfce7' : '#fee2e2',
                              color: definition.allowImport ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {definition.allowImport ? 'Allowed' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              background: definition.isActive ? '#dcfce7' : '#fef3c7',
                              color: definition.isActive ? '#15803d' : '#b45309',
                            }}
                          >
                            {definition.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="d-inline-flex gap-2">
                            <Button
                              icon="pi pi-arrow-right"
                              rounded
                              text
                              severity="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDefinitionRowClick(definition.id);
                              }}
                            />
                            <Button
                              icon="pi pi-pencil"
                              rounded
                              text
                              severity="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDefinitionDialog(definition);
                              }}
                            />
                            <Button
                              icon="pi pi-trash"
                              rounded
                              text
                              severity="danger"
                              disabled={definition.isSystem}
                              onClick={async (event) => {
                                event.stopPropagation();

                                if (!confirm(`Delete master "${definition.name}" and all its data?`)) {
                                  return;
                                }

                                await deleteDefinitionMutation.mutateAsync(definition.id);
                                showToast(
                                  'success',
                                  'Master Deleted',
                                  'Master definition deleted successfully.',
                                );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!filteredDefinitions.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-5 text-center text-muted">
                        No master definitions found. Try another filter or create a new master.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

      <div className="row g-4">
        <div className="col-12 d-none">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
                <div className="mb-3">
                  <h2 className="h5 mb-1">Master Definitions</h2>
                  <div className="text-muted small">
                    {selectedProjectOption
                      ? `Showing ${selectedProjectOption.name} masters for temporary tenant ${tenantId}.`
                      : 'Select a project to load master definitions.'}
                  </div>
                </div>

              <div className="d-flex flex-column gap-3">
                {filteredDefinitions.map((definition) => (
                  <button
                    key={definition.id}
                    type="button"
                    className={`text-start border rounded-3 p-3 bg-white ${
                      effectiveDefinitionId === definition.id
                        ? 'border-primary shadow-sm'
                        : 'border-light'
                    }`}
                    onClick={() => setSelectedDefinitionId(definition.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <div className="fw-semibold d-flex align-items-center gap-2">
                            {definition.icon ? <i className={definition.icon} /> : null}
                            <span>{definition.name}</span>
                          </div>
                          <small className="text-muted d-block">
                            {definition.code}
                            {definition.project ? ` • ${definition.project.name}` : ' • No project'}
                          </small>
                        </div>
                      <Tag
                        value={definition.isActive ? 'Active' : 'Inactive'}
                        severity={definition.isActive ? 'success' : 'danger'}
                      />
                    </div>

                    {definition.description ? (
                      <div className="text-muted small mt-2">{definition.description}</div>
                    ) : null}

                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <Tag
                        value={definition.isSystem ? 'System' : 'Custom'}
                        severity={definition.isSystem ? 'warning' : 'info'}
                      />
                      <Tag
                        value={definition.allowImport ? 'CSV Import On' : 'CSV Import Off'}
                        severity={definition.allowImport ? 'success' : 'secondary'}
                      />
                      <Tag
                        value={`${definition.columnDefinitions?.length ?? 0} columns`}
                        severity="contrast"
                      />
                      <Tag
                        value={`${definition._count?.masterData ?? 0} rows`}
                        severity="contrast"
                      />
                    </div>
                  </button>
                ))}

                {!filteredDefinitions.length && (
                  <div className="text-muted">
                    {selectedProjectOption
                      ? 'No master definitions found for this project.'
                      : 'Select a project to load masters.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12" id="master-definition-detail">
          <div
            className="card border-0 shadow-sm h-100 overflow-hidden"
            style={{ borderRadius: '24px' }}
          >
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4 flex-wrap">
                <div>
                  <div
                    className="small text-uppercase fw-semibold mb-2"
                    style={{ color: '#8b5cf6', letterSpacing: '0.08em' }}
                  >
                    Master Workspace
                  </div>
                  <h2 className="h4 mb-1 fw-semibold" style={{ color: '#111827' }}>
                    {selectedDefinition?.name || 'Select a master definition'}
                  </h2>
                  <div className="text-muted small">
                    {selectedDefinition
                      ? `${selectedDefinition.code} • ${selectedDefinitionProjectName}`
                      : 'Choose a master from the list above to manage records and data rows.'}
                  </div>
                </div>

                {selectedDefinition ? (
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      label="Add Data"
                      icon="pi pi-plus"
                      onClick={() => openRecordDialog()}
                      style={{
                        borderRadius: '14px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      }}
                    />
                    <Button
                      label="Add Column"
                      icon="pi pi-table"
                      outlined
                      onClick={openColumnDialog}
                      style={{ borderRadius: '14px' }}
                    />
                    <Button
                      label="Edit Master"
                      icon="pi pi-pencil"
                      outlined
                      onClick={() => openDefinitionDialog(selectedDefinition)}
                      style={{ borderRadius: '14px' }}
                    />
                    <Button
                      icon="pi pi-trash"
                      rounded
                      text
                      severity="danger"
                      disabled={selectedDefinition.isSystem}
                      onClick={async () => {
                        if (!confirm(`Delete master "${selectedDefinition.name}" and all its data?`)) {
                          return;
                        }

                        await deleteDefinitionMutation.mutateAsync(selectedDefinition.id);
                        showToast('success', 'Master Deleted', 'Master definition deleted successfully.');
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {selectedDefinition ? (
                <div className="d-flex flex-wrap gap-2 mb-4">
                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{ background: '#ede9fe', color: '#6d28d9' }}
                  >
                    {selectedDefinitionColumnCount} columns
                  </span>
                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{ background: '#f3e8ff', color: '#7c3aed' }}
                  >
                    {formatIndianCount(selectedDefinitionRowCount)} rows
                  </span>
                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      background: selectedDefinition.allowImport ? '#dcfce7' : '#fee2e2',
                      color: selectedDefinition.allowImport ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {selectedDefinition.allowImport ? 'Import allowed' : 'Import blocked'}
                  </span>
                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      background: selectedDefinition.isActive ? '#dcfce7' : '#fef3c7',
                      color: selectedDefinition.isActive ? '#15803d' : '#b45309',
                    }}
                  >
                    {selectedDefinition.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : null}

              {activeColumns.length ? (
                <div className="mb-4">
                  <div className="small text-muted mb-2">Configured Columns</div>
                  <div className="d-flex flex-wrap gap-2">
                    {activeColumns.map((column) => (
                      <Tag
                        key={column.id}
                        value={`${column.columnLabel} (${column.columnKey})`}
                        severity={column.isRequired ? 'warning' : 'info'}
                      />
                    ))}
                  </div>
                </div>
              ) : selectedDefinition ? (
                <div
                  className="rounded-4 px-3 py-3 mb-4"
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.14)',
                    color: '#1d4ed8',
                  }}
                >
                  No <code>master_column_definition</code> rows are configured for this master yet.
                  Add Data will use the fallback Country/State/District/Block form.
                </div>
              ) : null}

              <div
                className="border rounded-4 overflow-hidden"
                style={{ borderColor: '#e5e7eb', background: '#fff' }}
              >
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr className="text-uppercase small text-muted">
                        {listableColumns.length ? (
                          listableColumns.map((column) => (
                            <th key={column.id} className="border-0 px-4 py-3">
                              {column.columnLabel}
                            </th>
                          ))
                        ) : (
                          <th className="border-0 px-4 py-3">Details</th>
                        )}
                        <th className="border-0 px-3 py-3">Valid From</th>
                        <th className="border-0 px-3 py-3">Valid To</th>
                        <th className="border-0 px-3 py-3">Sort Order</th>
                        <th className="border-0 px-3 py-3">Status</th>
                        <th className="border-0 px-4 py-3 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id}>
                          {listableColumns.length ? (
                            listableColumns.map((column) => (
                              <td key={column.id} className="px-4 py-3">
                                {formatCellValue(record.data?.[column.columnKey])}
                              </td>
                            ))
                          ) : (
                            <td className="text-break px-4 py-3">
                              {formatCellValue(
                                record.data?.details ||
                                  record.data?.master_name ||
                                  selectedDefinition?.name ||
                                  record.data,
                              )}
                            </td>
                          )}
                          <td className="px-3 py-3">
                            {formatCellValue(toDateInputValue(record.data?.valid_from))}
                          </td>
                          <td className="px-3 py-3">
                            {formatCellValue(toDateInputValue(record.data?.valid_to))}
                          </td>
                          <td className="px-3 py-3">
                            {formatCellValue(record.data?.sort_order ?? 0)}
                          </td>
                          <td className="px-3 py-3">
                            <Tag
                              value={record.isActive ? 'Active' : 'Inactive'}
                              severity={record.isActive ? 'success' : 'danger'}
                            />
                          </td>
                          <td className="px-4 py-3 text-end">
                            <div className="d-inline-flex gap-2">
                              <Button
                                icon="pi pi-pencil"
                                text
                                rounded
                                onClick={() => openRecordDialog(record)}
                              />
                              <Button
                                icon="pi pi-trash"
                                text
                                rounded
                                severity="danger"
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Delete "${getRecordLabel(record, activeColumns)}" from ${selectedDefinition?.name}?`,
                                    )
                                  ) {
                                    return;
                                  }

                                  await deleteRecordMutation.mutateAsync({
                                    id: record.id,
                                    masterId: selectedDefinition!.id,
                                  });
                                  showToast('success', 'Data Deleted', 'Master data deleted successfully.');
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!records.length && (
                        <tr>
                          <td
                            colSpan={(listableColumns.length || 1) + 5}
                            className="text-muted px-4 py-5 text-center"
                          >
                            No data rows yet. Add a record to start saving master data.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
      )}

      <Dialog
        visible={definitionDialogVisible}
        onHide={() => setDefinitionDialogVisible(false)}
        header={editingDefinition ? 'Edit Master Definition' : 'Create Master Definition'}
        modal
        style={{ width: '48rem' }}
        >
          <form onSubmit={handleDefinitionSubmit} className="d-flex flex-column gap-3">
            <div className="alert alert-info py-2 mb-0">
              Tenant ID: <strong>{tenantId}</strong>
              {' • '}
              Project: <strong>{dialogProjectName}</strong>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Project</label>
                <Dropdown
                  className="w-100"
                  value={definitionForm.projectId}
                  onChange={(event) =>
                    setDefinitionForm((previous) => ({
                      ...previous,
                      projectId: event.value ?? null,
                    }))
                  }
                  options={mockProjects}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select project"
                  filter
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Master Name</label>
                <InputText
                  className="w-100"
                  value={definitionForm.name}
                  onChange={(event) => handleDefinitionNameChange(event.target.value)}
                  required
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Master Code</label>
                <InputText
                  className="w-100"
                  value={generatedDefinitionCode}
                  readOnly
                  required
                />
                <small className="text-muted">
                  Auto-generated as `M_` + first 4 letters of master name + running number.
                </small>
              </div>
            </div>

          <span>
            <label className="form-label">Description</label>
            <InputTextarea
              className="w-100"
              rows={3}
              value={definitionForm.description}
              onChange={(event) =>
                setDefinitionForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
            />
          </span>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Icon Class</label>
              <InputText
                className="w-100"
                value={definitionForm.icon}
                onChange={(event) =>
                  setDefinitionForm((previous) => ({ ...previous, icon: event.target.value }))
                }
                placeholder="bi-map"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Display Order</label>
              <InputNumber
                className="w-100"
                value={definitionForm.displayOrder}
                onValueChange={(event) =>
                  setDefinitionForm((previous) => ({
                    ...previous,
                    displayOrder: event.value ?? 0,
                  }))
                }
                useGrouping={false}
              />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={definitionForm.isActive}
                  onChange={(event) =>
                    setDefinitionForm((previous) => ({
                      ...previous,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">Active master</span>
              </label>
            </div>
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={definitionForm.isSystem}
                  onChange={(event) =>
                    setDefinitionForm((previous) => ({
                      ...previous,
                      isSystem: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">System protected</span>
              </label>
            </div>
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={definitionForm.allowImport}
                  onChange={(event) =>
                    setDefinitionForm((previous) => ({
                      ...previous,
                      allowImport: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">Allow CSV import</span>
              </label>
            </div>
          </div>

          <Button
            label={editingDefinition ? 'Update Master' : 'Create Master'}
            type="submit"
            loading={
              createDefinitionMutation.isPending || updateDefinitionMutation.isPending
            }
          />
        </form>
      </Dialog>

      <Dialog
        visible={columnDialogVisible}
        onHide={() => setColumnDialogVisible(false)}
        header="Add Column"
        modal
        style={{ width: '36rem' }}
      >
        <form onSubmit={handleColumnSubmit} className="d-flex flex-column gap-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Column Key</label>
              <InputText
                className="w-100"
                value={columnForm.columnKey}
                onChange={(event) =>
                  handleColumnFormChange('columnKey', normalizeColumnKey(event.target.value))
                }
                placeholder="column_key"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Column Label</label>
              <InputText
                className="w-100"
                value={columnForm.columnLabel}
                onChange={(event) =>
                  handleColumnFormChange('columnLabel', event.target.value)
                }
                placeholder="Column Label"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Data Type</label>
              <Dropdown
                className="w-100"
                value={columnForm.dataType}
                options={COLUMN_DATA_TYPE_OPTIONS}
                optionLabel="label"
                optionValue="value"
                onChange={(event) =>
                  handleColumnFormChange('dataType', event.value as ColumnDataTypeOption)
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">From Master</label>
              <Dropdown
                className="w-100"
                value={columnForm.fromMasterCode}
                options={fromMasterOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(event) =>
                  handleColumnFormChange(
                    'fromMasterCode',
                    (event.value as string | null) ?? null,
                  )
                }
                placeholder="Select from master"
                filter
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">To Master</label>
              <Dropdown
                className="w-100"
                value={columnForm.toMasterCode}
                options={toMasterOptions}
                optionLabel="label"
                optionValue="value"
                onChange={(event) =>
                  handleColumnFormChange(
                    'toMasterCode',
                    (event.value as string | null) ?? null,
                  )
                }
                placeholder="Select to master"
                filter
                disabled={!columnForm.fromMasterCode}
              />
            </div>
            <div className="col-12">
              <small className="text-muted">
                From Master shows all earlier defined masters. After you choose one, To Master
                shows the remaining masters.
              </small>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={columnForm.isRequired}
                  onChange={(event) =>
                    handleColumnFormChange('isRequired', event.target.checked)
                  }
                />
                <span className="form-check-label">Required</span>
              </label>
            </div>
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={columnForm.isSearchable}
                  onChange={(event) =>
                    handleColumnFormChange('isSearchable', event.target.checked)
                  }
                />
                <span className="form-check-label">Is Searchable</span>
              </label>
            </div>
            <div className="col-md-4">
              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={columnForm.isListable}
                  onChange={(event) =>
                    handleColumnFormChange('isListable', event.target.checked)
                  }
                />
                <span className="form-check-label">Is Listable</span>
              </label>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button
              label="Cancel"
              type="button"
              outlined
              onClick={() => setColumnDialogVisible(false)}
            />
            <Button
              label="Save"
              type="submit"
              loading={createColumnMutation.isPending}
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        visible={recordDialogVisible}
        onHide={() => setRecordDialogVisible(false)}
        header={editingRecord ? 'Edit Master Data' : 'Add Master Data'}
        modal
        style={{ width: '52rem' }}
      >
        <form onSubmit={handleRecordSubmit} className="d-flex flex-column gap-3">
          {shouldUseStaticFallbackForm ? (
            <div className="d-flex flex-column gap-3">
              <div className="alert alert-info py-2 mb-0">
                No column definitions found for this master. Using the temporary
                cascading fallback form.
              </div>

              <div>
                <label className="form-label">Country</label>
                <Dropdown
                  className="w-100"
                  value={recordForm.country ?? ''}
                  options={countryOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select Country"
                  onChange={(event) => handleRecordFieldChange('country', event.value ?? '')}
                  showClear
                />
              </div>

              <div>
                <label className="form-label">State</label>
                <Dropdown
                  className="w-100"
                  value={recordForm.state ?? ''}
                  options={stateOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select State"
                  onChange={(event) => handleRecordFieldChange('state', event.value ?? '')}
                  disabled={!selectedCountry}
                  showClear
                />
              </div>

              <div>
                <label className="form-label">District</label>
                <Dropdown
                  className="w-100"
                  value={recordForm.district ?? ''}
                  options={districtOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select District"
                  onChange={(event) => handleRecordFieldChange('district', event.value ?? '')}
                  disabled={!selectedState}
                  showClear
                />
              </div>

              <div>
                <label className="form-label">Block/Ward</label>
                <Dropdown
                  className="w-100"
                  value={recordForm.block ?? ''}
                  options={blockOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select Block/Ward"
                  onChange={(event) => handleRecordFieldChange('block', event.value ?? '')}
                  disabled={!selectedDistrict}
                  showClear
                />
              </div>
            </div>
          ) : shouldShowAutoMasterNameField ? (
            <div className="d-flex flex-column gap-3">
              <div>
                <label className="form-label">Master Name</label>
                <InputText
                  className="w-100"
                  value={autoMasterNameValue}
                  readOnly
                />
              </div>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {activeColumns.map((column) => (
                <DynamicFormField
                  key={column.id}
                  column={column}
                  value={recordForm[column.columnKey]}
                  tenantId={tenantId}
                  formData={recordForm}
                  onChange={(value) => handleRecordFieldChange(column.columnKey, value)}
                />
              ))}
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Valid From</label>
              <InputText
                type="date"
                className="w-100"
                value={recordFixedFields.validFrom}
                onChange={(event) =>
                  handleRecordFixedFieldChange('validFrom', event.target.value)
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Valid To</label>
              <InputText
                type="date"
                className="w-100"
                value={recordFixedFields.validTo}
                onChange={(event) =>
                  handleRecordFixedFieldChange('validTo', event.target.value)
                }
              />
            </div>
            {!shouldUseStaticFallbackForm ? (
              <div className="col-md-6">
                <label className="form-label">Sort Order</label>
                <InputNumber
                  className="w-100"
                  value={recordFixedFields.sortOrder}
                  onValueChange={(event) =>
                    handleRecordFixedFieldChange('sortOrder', event.value ?? 0)
                  }
                  useGrouping={false}
                />
              </div>
            ) : null}
            <div className="col-md-6 d-flex align-items-end">
              <label className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={recordFixedFields.isActive}
                  onChange={(event) =>
                    handleRecordFixedFieldChange('isActive', event.target.checked)
                  }
                />
                <span className="form-check-label">Active row</span>
              </label>
            </div>
          </div>

          <Button
            label={editingRecord ? 'Update Data' : 'Create Data'}
            type="submit"
            loading={
              createRecordMutation.isPending ||
              updateRecordMutation.isPending
            }
          />
        </form>
      </Dialog>
    </div>
  );
};
