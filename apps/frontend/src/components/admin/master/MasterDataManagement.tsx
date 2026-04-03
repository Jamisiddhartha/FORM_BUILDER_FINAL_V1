'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { TreeTable } from 'primereact/treetable';
import { Column } from 'primereact/column';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { useColumnDefinitions, MasterColumnDefinition } from '@/hooks/master/useColumnDefinitions';
import { DynamicFormField } from './DynamicFormField';
import { ColumnDefinitionManager } from './ColumnDefinitionManager';
import { HierarchicalCascadingDemo } from './HierarchicalCascadingDemo';
import {
  MasterDataDefinition,
  MasterDataRecord,
  MasterDataProject,
  MasterDataTreeNode,
  useCreateMasterDataDefinition,
  useCreateMasterDataRecord,
  useDeleteMasterDataDefinition,
  useDeleteMasterDataRecord,
  useMasterDataDefinition,
  useMasterDataDefinitions,
  useToggleMasterDataDefinition,
  useToggleMasterDataProject,
  useUpdateMasterDataDefinition,
  useUpdateMasterDataRecord,
  useUploadMasterDataCsv,
} from '@/hooks/master/useMasterDataManagement';

// Mock project data - TODO: Replace with API call to GET /tenant-projects
const MOCK_PROJECTS = [
  { id: 1, name: 'Industrial Approval', code: 'INDV_APPR', description: 'Industrial Approval master data', isActive: true },
  { id: 2, name: 'Forest Clearance', code: 'FRT_CLR', description: 'Forest Clearance master data', isActive: true },
  { id: 3, name: 'Environmental Certificate', code: 'ENV_CERT', description: 'Environmental Certificate master data', isActive: true },
];

type DefinitionFormState = {
  projectId: string;
  name: string;
  code: string;
  description: string;
  supportsHierarchy: boolean;
  hasValidityPeriod: boolean;
  validFrom: string;
  validTo: string;
  isActive: boolean;
};

type RecordFormState = Record<string, any>;

const emptyDefinitionForm = (projectId?: number | null): DefinitionFormState => ({
  projectId: projectId ? String(projectId) : '',
  name: '',
  code: '',
  description: '',
  supportsHierarchy: true,
  hasValidityPeriod: true,
  validFrom: '',
  validTo: '',
  isActive: true,
});

const emptyRecordForm = (columns?: MasterColumnDefinition[]): RecordFormState => {
  const form: RecordFormState = {};
  if (columns) {
    columns.forEach((column) => {
      form[column.columnKey] = column.dataType === 'MULTI_SELECT' ? [] : '';
    });
  }
  return form;
};

const normalizeCode = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const buildTableName = (value: string) =>
  `md_${normalizeCode(value)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Generate master code based on first 4 letters of name + incrementing number
 * Example: "Approval" → "APPR001", "APPR002", etc.
 */
const generateMasterCode = (masterName: string, existingDefinitions: any[]) => {
  if (!masterName || masterName.trim().length === 0) {
    return '';
  }

  // Get first 4 letters, uppercase
  const prefix = masterName
    .trim()
    .substring(0, 4)
    .toUpperCase()
    .replace(/[^a-zA-Z0-9]/g, '');

  if (prefix.length === 0) {
    return '';
  }

  // Count existing codes with the same prefix
  const matchingCodes = existingDefinitions
    .filter((def) => def.code && def.code.startsWith(prefix))
    .map((def) => {
      const match = def.code.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  // Get the next number
  const nextNumber = matchingCodes.length > 0 ? Math.max(...matchingCodes) + 1 : 1;

  // Format: PREFIXNNN (e.g., APPR001, APPR002)
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
};

export const MasterDataManagement = () => {
  const toastRef = useRef<Toast | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Use mock projects for now (TODO: integrate with API GET /tenant-projects)
  const projects = MOCK_PROJECTS;
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projects[0]?.id ?? null);
  const [definitionSearch, setDefinitionSearch] = useState('');
  const effectiveProjectId = selectedProjectId ?? undefined;

  const { data: definitions = [] } = useMasterDataDefinitions(
    effectiveProjectId,
    definitionSearch,
  );
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const effectiveDefinitionId =
    selectedDefinitionId && definitions.some((item) => item.id === selectedDefinitionId)
      ? selectedDefinitionId
      : definitions[0]?.id;
  const { data: selectedDefinitionDetail } = useMasterDataDefinition(
    effectiveDefinitionId,
  );
  const { data: columnDefinitions = [] } = useColumnDefinitions(effectiveDefinitionId);

  const createDefinitionMutation = useCreateMasterDataDefinition();
  const updateDefinitionMutation = useUpdateMasterDataDefinition();
  const toggleDefinitionMutation = useToggleMasterDataDefinition();
  const deleteDefinitionMutation = useDeleteMasterDataDefinition();
  const createRecordMutation = useCreateMasterDataRecord();
  const updateRecordMutation = useUpdateMasterDataRecord();
  const deleteRecordMutation = useDeleteMasterDataRecord();
  const uploadCsvMutation = useUploadMasterDataCsv();

  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [columnDialogVisible, setColumnDialogVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'columns' | 'demo'>('records');

  const [editingDefinition, setEditingDefinition] = useState<MasterDataDefinition | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);

  const [definitionForm, setDefinitionForm] = useState<DefinitionFormState>(
    emptyDefinitionForm(null),
  );
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm());

  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.id === effectiveDefinitionId) || null,
    [definitions, effectiveDefinitionId],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [selectedProjectId, projects],
  );

  const projectPreviewSchema = selectedProject?.schemaName || 'Select a project';
  const tablePreview = definitionForm.code ? buildTableName(definitionForm.code) : 'Auto-generated after code';

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

  const openDefinitionDialog = (definition?: MasterDataDefinition) => {
    if (!definition && !effectiveProjectId) {
      showToast('warn', 'Project Required', 'Select or create a project before adding a master definition.');
      return;
    }

    if (definition) {
      setEditingDefinition(definition);
      setDefinitionForm({
        projectId: String(definition.projectId),
        name: definition.name,
        code: definition.code,
        description: definition.description || '',
        supportsHierarchy: definition.supportsHierarchy,
        hasValidityPeriod: definition.hasValidityPeriod,
        validFrom: definition.validFrom ? String(definition.validFrom).slice(0, 10) : '',
        validTo: definition.validTo ? String(definition.validTo).slice(0, 10) : '',
        isActive: definition.isActive,
      });
    } else {
      setEditingDefinition(null);
      setDefinitionForm(emptyDefinitionForm(effectiveProjectId ?? null));
    }
    setDefinitionDialogVisible(true);
  };

  const openRecordDialog = (record?: MasterDataRecord) => {
    if (!selectedDefinition) {
      showToast('warn', 'Definition Required', 'Select a master definition before adding records.');
      return;
    }

    if (record && columnDefinitions.length > 0) {
      setEditingRecord(record);
      // Map record data to dynamic form based on column definitions
      const formData: RecordFormState = {};
      columnDefinitions.forEach((column) => {
        const dataValue = record.data?.[column.columnKey];
        // Handle MULTI_SELECT arrays, others as-is
        if (column.dataType === 'MULTI_SELECT' && !Array.isArray(dataValue)) {
          formData[column.columnKey] = Array.isArray(dataValue) ? dataValue : [];
        } else {
          formData[column.columnKey] = dataValue ?? '';
        }
      });
      setRecordForm(formData);
    } else {
      setEditingRecord(null);
      setRecordForm(emptyRecordForm(columnDefinitions));
    }
    setRecordDialogVisible(true);
  };

  const handleProjectSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingProjectId) {
        await updateProjectMutation.mutateAsync({
          id: editingProjectId,
          data: {
            name: projectForm.name,
            description: projectForm.description,
            isActive: projectForm.isActive,
          },
        });
        showToast('success', 'Project Updated', 'Project details updated successfully.');
      } else {
        const created = await createProjectMutation.mutateAsync(projectForm);
        setSelectedProjectId(created.id);
        showToast('success', 'Project Created', 'Project created successfully.');
      }
      setProjectDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Project Error', getErrorMessage(error, 'Unable to save project.'));
    }
  };

  const handleDefinitionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      // Ensure projectId is always valid - use selectedProjectId if available
      const projectId = selectedProjectId || (editingDefinition?.projectId ? Number(editingDefinition.projectId) : undefined);
      
      if (!projectId && !editingDefinition) {
        showToast('error', 'Validation Error', 'Please select a project before creating a definition.');
        return;
      }

      const payload = {
        projectId: projectId!,
        name: definitionForm.name,
        code: definitionForm.code,
        description: definitionForm.description || undefined,
        supportsHierarchy: definitionForm.supportsHierarchy,
        hasValidityPeriod: definitionForm.hasValidityPeriod,
        validFrom: definitionForm.validFrom || undefined,
        validTo: definitionForm.validTo || undefined,
        isActive: definitionForm.isActive,
      };

      if (editingDefinition) {
        await updateDefinitionMutation.mutateAsync({ id: editingDefinition.id, data: payload });
        showToast('success', 'Definition Updated', 'Master definition updated successfully.');
      } else {
        const created = await createDefinitionMutation.mutateAsync(payload);
        setSelectedDefinitionId(created.id);
        showToast('success', 'Definition Created', 'Master definition created and table provisioned.');
      }
      setDefinitionDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Definition Error', getErrorMessage(error, 'Unable to save master definition.'));
    }
  };

  const handleRecordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!effectiveDefinitionId) return;

    try {
      // Check required fields
      const requiredColumns = columnDefinitions.filter((col) => col.isRequired);
      for (const col of requiredColumns) {
        if (!recordForm[col.columnKey]) {
          showToast('warn', 'Validation Error', `${col.displayName} is required`);
          return;
        }
      }

      // Build payload with dynamic fields from column definitions
      const payload: any = {
        data: {},
      };

      columnDefinitions.forEach((column) => {
        payload.data[column.columnKey] = recordForm[column.columnKey] ?? null;
      });

      if (editingRecord) {
        await updateRecordMutation.mutateAsync({
          definitionId: effectiveDefinitionId,
          recordId: editingRecord.id,
          data: payload,
        });
        showToast('success', 'Record Updated', 'Master record updated successfully.');
      } else {
        await createRecordMutation.mutateAsync({ definitionId: effectiveDefinitionId, data: payload });
        showToast('success', 'Record Created', 'Master record created successfully.');
      }
      setRecordDialogVisible(false);
    } catch (error: unknown) {
      showToast('error', 'Record Error', getErrorMessage(error, 'Unable to save record.'));
    }
  };

  const handleCsvFileSelected = async (file?: File | null) => {
    if (!file || !effectiveDefinitionId) return;
    try {
      const result = await uploadCsvMutation.mutateAsync({
        definitionId: effectiveDefinitionId,
        file,
      });
      showToast(
        result.failedRows > 0 ? 'warn' : 'success',
        'CSV Upload Complete',
        `${result.successfulRows} row(s) imported, ${result.failedRows} failed.`,
      );
    } catch (error: unknown) {
      showToast('error', 'CSV Upload Error', getErrorMessage(error, 'Unable to upload CSV.'));
    }
  };

  const recordActionTemplate = (node: MasterDataTreeNode) => (
    <div className="d-flex gap-2">
      <Button icon="pi pi-pencil" text rounded onClick={() => openRecordDialog(node.data)} />
      <Button
        icon="pi pi-trash"
        text
        rounded
        severity="danger"
        onClick={async () => {
          if (!effectiveDefinitionId) return;
          if (!confirm(`Delete record "${node.data.name}"?`)) return;
          await deleteRecordMutation.mutateAsync({
            definitionId: effectiveDefinitionId,
            recordId: node.data.id,
          });
          showToast('success', 'Record Deleted', 'Record deleted successfully.');
        }}
      />
    </div>
  );

  const leftToolbarTemplate = () => (
    <div className="d-flex gap-2 flex-wrap">
      <Dropdown
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.value)}
        options={projects.map((p) => ({ label: p.name, value: p.id }))}
        placeholder="Select a project"
        className="dropdown-select"
        style={{ minWidth: '250px' }}
      />
      <Button
        label="Add Master"
        icon="pi pi-plus"
        severity="success"
        onClick={() => openDefinitionDialog()}
        disabled={!selectedProjectId}
      />
      <Button
        label="Add Record"
        icon="pi pi-sitemap"
        severity="help"
        onClick={() => openRecordDialog()}
        disabled={!effectiveDefinitionId || !selectedProjectId}
      />
      <Button
        label="Upload CSV"
        icon="pi pi-upload"
        severity="warning"
        onClick={() => csvInputRef.current?.click()}
        disabled={!effectiveDefinitionId || uploadCsvMutation.isPending}
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
    <div className="d-flex align-items-center gap-2">
      <InputText
        value={definitionSearch}
        onChange={(event) => setDefinitionSearch(event.target.value)}
        placeholder="Search master definitions"
      />
      {selectedDefinition && (
        <Tag
          value={selectedDefinition.masterTable?.master_code || selectedDefinition.code}
          severity="info"
        />
      )}
    </div>
  );

  return (
    <div className="p-4">
      <Toast ref={toastRef} />
      <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-4" />

      <div className="row g-4">
        <div className="col-xl-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Projects</h2>
              </div>
              <div className="d-flex flex-column gap-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`text-start border rounded-3 p-3 bg-white cursor-pointer ${effectiveProjectId === project.id ? 'border-primary shadow-sm' : 'border-light'}`}
                    onClick={() => setSelectedProjectId(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedProjectId(project.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{project.name}</div>
                        <small className="text-muted">{project.code}</small>
                      </div>
                      <Tag value={project.isActive ? 'Active' : 'Inactive'} severity={project.isActive ? 'success' : 'danger'} />
                    </div>
                    <div className="text-muted small mt-2">{project.description || 'No description'}</div>
                  </div>
                ))}
                {projects.length === 0 && <div className="text-muted">No projects created yet.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 className="h5 mb-1">Master Definitions</h2>
                  <div className="text-muted small">
                    {selectedProject ? `Schema: ${selectedProject.schemaName}` : 'Select a project to start'}
                  </div>
                </div>
                {selectedDefinition && (
                  <div className="d-flex gap-2">
                    <Button icon="pi pi-pencil" rounded text onClick={() => openDefinitionDialog(selectedDefinition)} />
                    <Button
                      icon={selectedDefinition.isActive ? 'pi pi-eye-slash' : 'pi pi-check'}
                      rounded
                      text
                      severity={selectedDefinition.isActive ? 'warning' : 'success'}
                      onClick={async () => {
                        await toggleDefinitionMutation.mutateAsync(selectedDefinition.id);
                        showToast('success', 'Definition Updated', `Definition ${selectedDefinition.isActive ? 'deactivated' : 'activated'} successfully.`);
                      }}
                    />
                    <Button
                      icon="pi pi-trash"
                      rounded
                      text
                      severity="danger"
                      onClick={async () => {
                        if (!selectedDefinition || !confirm(`Delete "${selectedDefinition.name}" and its generated table?`)) return;
                        await deleteDefinitionMutation.mutateAsync(selectedDefinition.id);
                        setSelectedDefinitionId(null);
                        showToast('success', 'Definition Deleted', 'Master definition deleted successfully.');
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="d-flex flex-wrap gap-3">
                {definitions.map((definition) => (
                  <button
                    key={definition.id}
                    type="button"
                    className={`text-start border rounded-3 p-3 bg-white ${effectiveDefinitionId === definition.id ? 'border-primary shadow-sm' : 'border-light'}`}
                    onClick={() => setSelectedDefinitionId(definition.id)}
                    style={{ minWidth: 280 }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{definition.name}</div>
                        <small className="text-muted">{definition.code}</small>
                      </div>
                      <Tag value={definition.isActive ? 'Active' : 'Inactive'} severity={definition.isActive ? 'success' : 'danger'} />
                    </div>
                    <div className="small text-muted mt-2">{definition.tableName}</div>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {definition.supportsHierarchy && <Tag value="Hierarchy" severity="info" />}
                      {definition.hasValidityPeriod && <Tag value="Validity" severity="warning" />}
                    </div>
                    <div className="small mt-3">
                      Records: <strong>{definition.recordCount || 0}</strong>
                    </div>
                    <div className="small text-muted">
                      {definition.validFrom || definition.validTo
                        ? `${definition.validFrom ? String(definition.validFrom).slice(0, 10) : 'Open'} to ${definition.validTo ? String(definition.validTo).slice(0, 10) : 'Open'}`
                        : 'Open-ended validity'}
                    </div>
                  </button>
                ))}
                {definitions.length === 0 && (
                  <div className="text-muted">No master definitions found for this project.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="h5 mb-1">{activeTab === 'columns' ? 'Column Definitions' : 'Record Hierarchy'}</h2>
              <div className="text-muted small">
                {selectedDefinition
                  ? `${selectedDefinition.name} in ${selectedDefinition.schemaName}.${selectedDefinition.tableName}`
                  : 'Select a master definition to manage records'}
              </div>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {activeTab === 'columns' && effectiveDefinitionId && (
                <Button
                  label="Add Column"
                  icon="pi pi-plus"
                  severity="success"
                  onClick={() => setColumnDialogVisible(true)}
                />
              )}
              {selectedDefinitionDetail?.uploadBatches?.length && activeTab === 'records' ? (
                <Tag value={`Last upload: ${selectedDefinitionDetail.uploadBatches[0].status}`} severity="info" />
              ) : null}
            </div>
          </div>

          {/* Tabs - Using Bootstrap styling */}
          <div className="border-bottom mb-3">
            <div className="d-flex gap-2">
              <button
                className={`btn btn-sm ${activeTab === 'columns' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('columns')}
                style={{ borderBottom: activeTab === 'columns' ? '3px solid #0d6efd' : 'none' }}
              >
                <i className="pi pi-list me-2"></i>
                Columns ({columnDefinitions.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'records' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('records')}
                style={{ borderBottom: activeTab === 'records' ? '3px solid #0d6efd' : 'none' }}
              >
                <i className="pi pi-table me-2"></i>
                Records ({selectedDefinitionDetail?.tree?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'demo' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('demo')}
                style={{ borderBottom: activeTab === 'demo' ? '3px solid #0d6efd' : 'none' }}
              >
                <i className="pi pi-play me-2"></i>
                Demo
              </button>
            </div>
          </div>

          {/* Columns Tab */}
          {activeTab === 'columns' && effectiveDefinitionId && (
            <div>
              {columnDefinitions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>Order</th>
                        <th>Label</th>
                        <th>Key</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Unique</th>
                        <th>Searchable</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnDefinitions.map((col: any) => (
                        <tr key={col.id}>
                          <td><Tag value={String(col.displayOrder)} /></td>
                          <td className="fw-semibold">{col.columnLabel}</td>
                          <td><code>{col.columnKey}</code></td>
                          <td><Tag value={col.dataType} severity="info" /></td>
                          <td><Checkbox checked={col.isRequired} disabled /></td>
                          <td><Checkbox checked={col.isUnique} disabled /></td>
                          <td><Checkbox checked={col.isSearchable} disabled /></td>
                          <td>
                            <Button icon="pi pi-pencil" rounded text size="small" />
                            <Button icon="pi pi-trash" rounded text severity="danger" size="small" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-info">
                  <i className="pi pi-info-circle me-2"></i>
                  <strong>No columns defined yet.</strong> Click the "Add Column" button in the top right to create columns for this master.
                </div>
              )}
            </div>
          )}

          {/* Records Tab */}
          {activeTab === 'records' && (
            <>
              <TreeTable value={selectedDefinitionDetail?.tree || []} tableStyle={{ minWidth: '100%' }}>
                <Column field="name" header="Name" expander body={(node) => <span className="fw-semibold">{node.data.name}</span>} />
                <Column field="code" header="Code" body={(node) => node.data.code} />
                <Column field="validityPeriod" header="Validity" body={(node) => node.data.validityPeriod || 'Open-ended'} />
                <Column field="department_name" header="Department" body={(node) => node.data.department_name || '-'} />
                <Column field="sub_department_name" header="Sub-Department" body={(node) => node.data.sub_department_name || '-'} />
                <Column field="is_active" header="Status" body={(node) => <Tag value={node.data.is_active ? 'Active' : 'Inactive'} severity={node.data.is_active ? 'success' : 'danger'} />} />
                <Column body={recordActionTemplate} header="Actions" />
              </TreeTable>

              {!selectedDefinitionDetail?.tree?.length && (
                <div className="text-muted mt-3">No records yet. Add a record or upload a CSV to populate this master.</div>
              )}

              {selectedDefinitionDetail?.uploadBatches?.length ? (
                <div className="mt-4">
                  <h3 className="h6">Recent Upload Batches</h3>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Success</th>
                          <th>Failed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDefinitionDetail.uploadBatches.map((batch) => (
                          <tr key={batch.id}>
                            <td>{batch.fileName}</td>
                            <td><Tag value={batch.status} severity={batch.status === 'FAILED' ? 'danger' : batch.status === 'PARTIAL' ? 'warning' : 'success'} /></td>
                            <td>{batch.totalRows}</td>
                            <td>{batch.successfulRows}</td>
                            <td>{batch.failedRows}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Demo Tab - Hierarchical Cascading Demo */}
          {activeTab === 'demo' && (
            <div>
              <HierarchicalCascadingDemo />
            </div>
          )}
        </div>
      </div>

      <Dialog visible={definitionDialogVisible} onHide={() => setDefinitionDialogVisible(false)} header={editingDefinition ? 'Edit Master Definition' : 'Create Master Definition'} modal style={{ width: '48rem' }}>
        <form onSubmit={handleDefinitionSubmit} className="d-flex flex-column gap-3">
          {selectedProject && (
            <div className="alert alert-info">
              <strong>Project:</strong> {selectedProject.name}
            </div>
          )}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Master Name <span className="text-danger">*</span></label>
              <InputText 
                className="w-100" 
                value={definitionForm.name} 
                onChange={(event) => {
                  const newName = event.target.value;
                  // Auto-generate code based on master name
                  const generatedCode = generateMasterCode(newName, definitions);
                  setDefinitionForm((prev) => ({ 
                    ...prev, 
                    name: newName,
                    code: generatedCode || prev.code
                  }));
                }} 
                required 
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Master Code</label>
              <InputText className="w-100" value={definitionForm.code} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))} required disabled={!!editingDefinition} />
            </div>
          </div>
          <span>
            <label className="form-label">Description</label>
            <InputTextarea className="w-100" rows={3} value={definitionForm.description} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, description: event.target.value }))} />
          </span>
          <div className="p-3 rounded-3 bg-light small">
            <div>Schema: <strong>{projectPreviewSchema}</strong></div>
            <div>Table: <strong>{tablePreview}</strong></div>
          </div>
          <div className="row g-3">
            <div className="col-md-6"><label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.supportsHierarchy} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, supportsHierarchy: event.target.checked }))} /><span className="form-check-label">Enable parent-child hierarchy</span></label></div>
            <div className="col-md-6"><label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.hasValidityPeriod} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, hasValidityPeriod: event.target.checked }))} /><span className="form-check-label">Enable validity period</span></label></div>
          </div>
          {definitionForm.hasValidityPeriod && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Valid From</label><InputText type="date" className="w-100" value={definitionForm.validFrom} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, validFrom: event.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Valid To</label><InputText type="date" className="w-100" value={definitionForm.validTo} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, validTo: event.target.value }))} /></div>
            </div>
          )}
          <label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.isActive} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span className="form-check-label">Active definition</span></label>
          <Button label={editingDefinition ? 'Update Definition' : 'Create Definition'} type="submit" loading={createDefinitionMutation.isPending || updateDefinitionMutation.isPending} />
        </form>
      </Dialog>

      <Dialog visible={recordDialogVisible} onHide={() => setRecordDialogVisible(false)} header={editingRecord ? 'Edit Record' : 'Add Record'} modal style={{ width: '46rem' }}>
        <form onSubmit={handleRecordSubmit} className="d-flex flex-column gap-3">
          {columnDefinitions.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {columnDefinitions.map((column) => (
                <DynamicFormField
                  key={column.id}
                  column={column}
                  value={recordForm[column.columnKey] ?? ''}
                  onChange={(val) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      [column.columnKey]: val,
                    }))
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-muted">No columns defined for this master definition. Add columns first.</p>
          )}
          <Button
            label={editingRecord ? 'Update Record' : 'Create Record'}
            type="submit"
            loading={createRecordMutation.isPending || updateRecordMutation.isPending}
            disabled={columnDefinitions.length === 0}
          />
        </form>
      </Dialog>
    </div>
  );
};
