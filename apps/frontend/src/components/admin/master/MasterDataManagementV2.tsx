'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

import { DynamicFormField } from '@/components/admin/master/DynamicFormField';
import {
  MasterDataEntryV2,
  MasterDefinitionV2,
  MasterDataReferenceV2,
  useCreateMasterDataEntry,
  useCreateMasterDataReference,
  useCreateMasterDefinition,
  useDeleteMasterDataReference,
  useDeleteMasterDataEntry,
  useDeleteMasterDefinition,
  useImportMasterDataCsv,
  useMasterDataEntries,
  useMasterDefinition,
  useMasterDefinitions,
  useUpdateMasterDataEntry,
  useUpdateMasterDefinition,
} from '@/hooks/master/useMasterDataManagementV2';
import {
  MasterColumnDefinition,
  useColumnDefinitions,
} from '@/hooks/master/useColumnDefinitions';

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

type ParentOption = {
  label: string;
  value: string;
};

const TEMP_TENANT_ID = 1;

// Temporary source until the tenant-projects API is finalized.
const mockProjects: ProjectOption[] = [
  { id: 101, name: 'Industrial Approval' },
  { id: 102, name: 'Forest Clearance' },
  { id: 103, name: 'Environmental Certificate' },
];

const isStateColumn = (column: MasterColumnDefinition) =>
  column.columnKey === 'state_id' || column.columnLabel.trim().toLowerCase() === 'state';

const buildMockColumns = (masterId?: number): MasterColumnDefinition[] => {
  if (!masterId) {
    return [];
  }

  return [
    {
      id: -1,
      masterId,
      columnKey: 'name',
      columnLabel: 'Name',
      dataType: 'TEXT',
      isRequired: true,
      isUnique: false,
      isSearchable: true,
      isListable: true,
      isFilterable: false,
      displayOrder: 1,
      options: undefined,
      validation: undefined,
      defaultValue: '',
      placeholder: 'Enter name',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: -2,
      masterId,
      columnKey: 'code',
      columnLabel: 'Code',
      dataType: 'TEXT',
      isRequired: true,
      isUnique: false,
      isSearchable: true,
      isListable: true,
      isFilterable: false,
      displayOrder: 2,
      options: undefined,
      validation: undefined,
      defaultValue: '',
      placeholder: 'Enter code',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ];
};

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

const normalizeCode = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

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

const getRecordLabel = (
  record: MasterDataEntryV2,
  columns: MasterColumnDefinition[],
) => {
  const preferredKeys = ['name', 'code'];

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

const getParentReference = (record?: MasterDataEntryV2 | null) =>
  record?.referencesFrom?.find((reference) => reference.columnKey === 'parent_id') ?? null;

export const MasterDataManagementV2 = () => {
  const toastRef = useRef<Toast | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const tenantId = TEMP_TENANT_ID;
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [definitionSearch, setDefinitionSearch] = useState('');
  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const [editingDefinition, setEditingDefinition] = useState<MasterDefinitionV2 | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterDataEntryV2 | null>(null);
  const [definitionForm, setDefinitionForm] = useState<DefinitionFormState>(
    emptyDefinitionForm(),
  );
  const [recordForm, setRecordForm] = useState<RecordFormState>({});
  const [parentId, setParentId] = useState<string | null>(null);
  const [recordFixedFields, setRecordFixedFields] = useState<RecordFixedFieldsState>(
    emptyRecordFixedFields(),
  );

  const { data: projectDefinitions = [] } = useMasterDefinitions(
    selectedProject ? tenantId : undefined,
    selectedProject ?? undefined,
  );
  const definitions = selectedProject ? projectDefinitions : [];
  const filteredDefinitions = useMemo(() => {
    const search = definitionSearch.trim().toLowerCase();

    if (!search) {
      return definitions;
    }

    return definitions.filter((definition) =>
      [definition.name, definition.code, definition.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search),
      );
    }, [definitionSearch, definitions]);

  useEffect(() => {
    if (!definitions.length) {
      setSelectedDefinitionId(null);
      return;
    }

    if (
      !selectedDefinitionId ||
      !definitions.some((definition) => definition.id === selectedDefinitionId)
    ) {
      setSelectedDefinitionId(definitions[0].id);
    }
  }, [definitions, selectedDefinitionId]);

  const effectiveDefinitionId =
    selectedDefinitionId && definitions.some((definition) => definition.id === selectedDefinitionId)
      ? selectedDefinitionId
      : definitions[0]?.id;

  const selectedProjectOption = useMemo(
    () => mockProjects.find((project) => project.id === selectedProject) || null,
    [selectedProject],
  );
  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.id === effectiveDefinitionId) || null,
    [definitions, effectiveDefinitionId],
  );

  const { data: selectedDefinitionDetail } = useMasterDefinition(effectiveDefinitionId);
  const {
    data: columnDefinitions = [],
    isLoading: isColumnDefinitionsLoading,
  } = useColumnDefinitions(effectiveDefinitionId);
  const { data: records = [] } = useMasterDataEntries(
    effectiveDefinitionId,
    tenantId ?? undefined,
  );

  const createDefinitionMutation = useCreateMasterDefinition();
  const updateDefinitionMutation = useUpdateMasterDefinition();
  const deleteDefinitionMutation = useDeleteMasterDefinition();
  const createRecordMutation = useCreateMasterDataEntry();
  const updateRecordMutation = useUpdateMasterDataEntry();
  const createReferenceMutation = useCreateMasterDataReference();
  const deleteReferenceMutation = useDeleteMasterDataReference();
  const deleteRecordMutation = useDeleteMasterDataEntry();
  const importCsvMutation = useImportMasterDataCsv();

  const activeColumns = useMemo(() => {
    if (columnDefinitions.length) {
      return columnDefinitions.filter((column) => !isStateColumn(column));
    }

    if (isColumnDefinitionsLoading || !effectiveDefinitionId) {
      return [];
    }

    return buildMockColumns(effectiveDefinitionId).filter((column) => !isStateColumn(column));
  }, [columnDefinitions, effectiveDefinitionId, isColumnDefinitionsLoading]);

  const listableColumns = useMemo(() => {
    const visible = activeColumns.filter((column) => column.isListable);
    return visible.length ? visible : activeColumns;
  }, [activeColumns]);

  const currentParentReference = useMemo(
    () => getParentReference(editingRecord),
    [editingRecord],
  );

  const parentOptions = useMemo<ParentOption[]>(
    () =>
      records
        .filter((record) => record.id !== editingRecord?.id)
        .map((record) => ({
          label: getRecordLabel(record, activeColumns),
          value: record.id,
        })),
    [records, editingRecord, activeColumns],
  );

  const shouldShowParentField = parentOptions.length > 0 || !!currentParentReference;

  const recordPayloadPreview = useMemo(
    () =>
      activeColumns.reduce<Record<string, unknown>>((accumulator, column) => {
        accumulator[column.columnKey] = serializeValue(recordForm[column.columnKey]);
        return accumulator;
      }, {}),
    [activeColumns, recordForm],
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

  const openDefinitionDialog = (definition?: MasterDefinitionV2 | null) => {
    if (definition) {
      setEditingDefinition(definition);
      setDefinitionForm({
        projectId: definition.projectId ?? selectedProject ?? null,
        name: definition.name,
        code: definition.code,
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

  const openRecordDialog = (record?: MasterDataEntryV2 | null) => {
    if (!selectedDefinition) {
      showToast('warn', 'Definition Required', 'Select a master before adding data.');
      return;
    }

    if (!activeColumns.length) {
      showToast('warn', 'Columns Loading', 'Wait a moment while the form fields are loading.');
      return;
    }

    if (record) {
      setEditingRecord(record);
      setRecordForm(buildRecordForm(activeColumns, record.data));
      setParentId(getParentReference(record)?.toDataId ?? null);
      setRecordFixedFields(buildRecordFixedFields(record));
    } else {
      setEditingRecord(null);
      setRecordForm(buildEmptyRecordForm(activeColumns));
      setParentId(null);
      setRecordFixedFields(emptyRecordFixedFields());
    }

    setRecordDialogVisible(true);
  };

  const handleRecordFieldChange = (key: string, value: unknown) => {
    setRecordForm((previous) => ({
      ...previous,
      [key]: value,
    }));
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

    if (!selectedProject) {
      showToast('warn', 'Project Required', 'Select a project before saving a master.');
      return;
    }

    try {
      const payload = {
        tenantId,
        projectId: selectedProject,
        name: definitionForm.name,
        code: definitionForm.code,
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
        setSelectedDefinitionId(created.id);
        showToast('success', 'Master Created', 'Master definition created successfully.');
      }

      setDefinitionDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Master Error', getErrorMessage(error, 'Unable to save master.'));
    }
  };

  const syncParentReference = async ({
    masterId,
    recordId,
    nextParentId,
    existingReference,
  }: {
    masterId: number;
    recordId: string;
    nextParentId: string | null;
    existingReference?: MasterDataReferenceV2 | null;
  }) => {
    const currentParentId = existingReference?.toDataId ?? null;

    if (nextParentId === currentParentId) {
      return;
    }

    if (existingReference?.id) {
      await deleteReferenceMutation.mutateAsync({
        id: existingReference.id,
        masterId,
      });
    }

    if (nextParentId) {
      await createReferenceMutation.mutateAsync({
        fromDataId: recordId,
        toDataId: nextParentId,
        columnKey: 'parent_id',
        masterId,
      });
    }
  };

  const handleRecordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!effectiveDefinitionId || !selectedProject) {
      showToast('warn', 'Context Required', 'Select a project and master before saving data.');
      return;
    }

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

    if (!activeColumns.length) {
      showToast('warn', 'Columns Required', 'No fields are available for this master yet.');
      return;
    }

    if (
      recordFixedFields.validFrom &&
      recordFixedFields.validTo &&
      new Date(recordFixedFields.validFrom) > new Date(recordFixedFields.validTo)
    ) {
      showToast('warn', 'Validation Error', 'Valid From cannot be later than Valid To.');
      return;
    }

    if (editingRecord && parentId === editingRecord.id) {
      showToast('warn', 'Validation Error', 'A record cannot be its own parent.');
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

      let savedRecord: MasterDataEntryV2;

      if (editingRecord) {
        savedRecord = await updateRecordMutation.mutateAsync({
          id: editingRecord.id,
          masterId: effectiveDefinitionId,
          data: {
            projectId: selectedProject,
            data: payload.data,
            valid_from: payload.valid_from,
            valid_to: payload.valid_to,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
            isActive: payload.is_active,
          },
        });
      } else {
        savedRecord = await createRecordMutation.mutateAsync({
          masterId: payload.master_id,
          tenantId: payload.tenant_id,
          projectId: selectedProject,
          data: payload.data,
          valid_from: payload.valid_from,
          valid_to: payload.valid_to,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
          isActive: payload.is_active,
        });
      }

      let parentSyncError: string | null = null;

      try {
        await syncParentReference({
          masterId: effectiveDefinitionId,
          recordId: savedRecord.id,
          nextParentId: shouldShowParentField ? parentId : null,
          existingReference: currentParentReference,
        });
      } catch (error) {
        parentSyncError = getErrorMessage(
          error,
          'Data was saved, but the parent-child link could not be updated.',
        );
      }

      showToast(
        'success',
        editingRecord ? 'Data Updated' : 'Data Created',
        editingRecord
          ? 'Master data updated successfully.'
          : 'Master data created successfully.',
      );

      if (parentSyncError) {
        showToast('warn', 'Parent Link Error', parentSyncError);
      }

      setRecordDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Data Error', getErrorMessage(error, 'Unable to save master data.'));
    }
  };

  const handleCsvFileSelected = async (file?: File | null) => {
    if (!file || !effectiveDefinitionId || !selectedProject) {
      return;
    }

    try {
      const result = await importCsvMutation.mutateAsync({
        masterId: effectiveDefinitionId,
        tenantId,
        projectId: selectedProject,
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

  const leftToolbarTemplate = () => (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      <span className="d-flex align-items-center gap-2">
        <span className="small text-muted">Select Project</span>
        <Dropdown
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.value ?? null)}
          options={mockProjects}
          optionLabel="name"
          optionValue="id"
          placeholder="Select project"
          className="w-100"
          style={{ minWidth: '16rem' }}
          filter
        />
      </span>
      <Button
        label="Add Master"
        icon="pi pi-plus"
        onClick={() => openDefinitionDialog()}
        disabled={!selectedProject}
      />
      <Button
        label="Add Data"
        icon="pi pi-database"
        severity="success"
        onClick={() => openRecordDialog()}
        disabled={!selectedProject || !effectiveDefinitionId}
      />
      <Button
        label="Import CSV"
        icon="pi pi-upload"
        severity="warning"
        onClick={() => csvInputRef.current?.click()}
        disabled={
          !selectedProject ||
          !effectiveDefinitionId ||
          !selectedDefinition?.allowImport ||
          importCsvMutation.isPending
        }
      />
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
  );

  const rightToolbarTemplate = () => (
    <InputText
      value={definitionSearch}
      onChange={(event) => setDefinitionSearch(event.target.value)}
      placeholder="Search masters"
    />
  );

  return (
    <div className="p-4">
      <Toast ref={toastRef} />
      <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-4" />

      <div className="row g-4">
        <div className="col-xl-4">
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

        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                <div>
                  <h2 className="h5 mb-1">
                    {selectedDefinition?.name || 'Select a master definition'}
                  </h2>
                  <div className="text-muted small">
                    {selectedDefinition
                      ? `Manage records for ${selectedDefinition.code}.`
                      : 'Create or select a master to start adding records.'}
                  </div>
                </div>

                {selectedDefinition ? (
                  <div className="d-flex gap-2">
                    <Button
                      icon="pi pi-pencil"
                      rounded
                      text
                      onClick={() => openDefinitionDialog(selectedDefinition)}
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

              {selectedDefinitionDetail?.columnDefinitions?.length ? (
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
                <div className="alert alert-warning py-2 mb-4">
                  Default fields are being used for this master right now.
                </div>
              ) : null}

              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      {listableColumns.length ? (
                        listableColumns.map((column) => (
                          <th key={column.id}>{column.columnLabel}</th>
                        ))
                      ) : (
                        <th>Details</th>
                      )}
                      <th>Valid From</th>
                      <th>Valid To</th>
                      <th>Sort Order</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        {listableColumns.length ? (
                          listableColumns.map((column) => (
                            <td key={column.id}>
                              {formatCellValue(record.data?.[column.columnKey])}
                            </td>
                          ))
                        ) : (
                          <td className="text-break">{formatCellValue(record.data)}</td>
                        )}
                        <td>{formatCellValue(toDateInputValue(record.data?.valid_from))}</td>
                        <td>{formatCellValue(toDateInputValue(record.data?.valid_to))}</td>
                        <td>{formatCellValue(record.data?.sort_order ?? 0)}</td>
                        <td>
                          <Tag
                            value={record.isActive ? 'Active' : 'Inactive'}
                            severity={record.isActive ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="text-end">
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
                          className="text-muted py-4"
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
              Project: <strong>{selectedProjectOption?.name ?? 'Not selected'}</strong>
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
                  disabled
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Master Name</label>
                <InputText
                  className="w-100"
                  value={definitionForm.name}
                onChange={(event) =>
                  setDefinitionForm((previous) => ({ ...previous, name: event.target.value }))
                }
                required
              />
            </div>
              <div className="col-md-12">
                <label className="form-label">Master Code</label>
                <InputText
                  className="w-100"
                value={definitionForm.code}
                onChange={(event) =>
                  setDefinitionForm((previous) => ({
                    ...previous,
                    code: normalizeCode(event.target.value),
                  }))
                }
                required
                disabled={!!editingDefinition}
              />
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
        visible={recordDialogVisible}
        onHide={() => setRecordDialogVisible(false)}
        header={editingRecord ? 'Edit Master Data' : 'Add Master Data'}
        modal
        style={{ width: '52rem' }}
      >
        <form onSubmit={handleRecordSubmit} className="d-flex flex-column gap-3">
          {activeColumns.length ? (
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
          ) : (
            <div className="text-muted">
              {isColumnDefinitionsLoading
                ? 'Loading form fields...'
                : 'No column definitions are available for this master yet.'}
            </div>
          )}

          {shouldShowParentField ? (
            <div>
              <label className="form-label">Parent</label>
              <Dropdown
                className="w-100"
                value={parentId}
                onChange={(event) => setParentId(event.value ?? null)}
                options={parentOptions}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Parent"
                showClear
                filter
              />
            </div>
          ) : null}

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
              updateRecordMutation.isPending ||
              createReferenceMutation.isPending ||
              deleteReferenceMutation.isPending
            }
            disabled={!activeColumns.length}
          />
        </form>
      </Dialog>
    </div>
  );
};
