'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { TreeTable } from 'primereact/treetable';
import { Column } from 'primereact/column';

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

import { useDepartments } from '@/hooks/master/useDepartments';
import {
  MasterDataDefinition,
  MasterDataRecord,
  MasterDataProject,
  MasterDataTreeNode,
  useCreateMasterDataDefinition,
  useCreateMasterDataProject,
  useCreateMasterDataRecord,
  useCreateSubDepartment,
  useDeleteMasterDataDefinition,
  useDeleteMasterDataRecord,
  useMasterDataDefinition,
  useMasterDataDefinitions,
  useMasterDataProjects,
  useSubDepartments,
  useToggleMasterDataDefinition,
  useToggleMasterDataProject,
  useUpdateMasterDataDefinition,
  useUpdateMasterDataProject,
  useUpdateMasterDataRecord,
  useUploadMasterDataCsv,
} from '@/hooks/master/useMasterDataManagement';

type DefinitionFormState = {
  projectId: string;
  name: string;
  code: string;
  description: string;
  supportsHierarchy: boolean;
  hasValidityPeriod: boolean;
  mapDepartment: boolean;
  mapSubDepartment: boolean;
  defaultDepartmentId: string;
  defaultSubDepartmentId: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
};

type RecordFormState = {
  code: string;
  name: string;
  description: string;
  parentId: string;
  validFrom: string;
  validTo: string;
  departmentId: string;
  subDepartmentId: string;
  sortOrder: string;
  metadata: string;
  isActive: boolean;
};

const emptyDefinitionForm = (projectId?: number | null): DefinitionFormState => ({
  projectId: projectId ? String(projectId) : '',
  name: '',
  code: '',
  description: '',
  supportsHierarchy: true,
  hasValidityPeriod: true,
  mapDepartment: false,
  mapSubDepartment: false,
  defaultDepartmentId: '',
  defaultSubDepartmentId: '',
  validFrom: '',
  validTo: '',
  isActive: true,
});

const emptyRecordForm = (): RecordFormState => ({
  code: '',
  name: '',
  description: '',
  parentId: '',
  validFrom: '',
  validTo: '',
  departmentId: '',
  subDepartmentId: '',
  sortOrder: '0',
  metadata: '{}',
  isActive: true,
});

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

export const MasterDataManagement = () => {
  const toastRef = useRef<Toast | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const { data: projects = [] } = useMasterDataProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [definitionSearch, setDefinitionSearch] = useState('');
  const effectiveProjectId = selectedProjectId ?? projects[0]?.id ?? undefined;
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
  const { data: departments = [] } = useDepartments();

  const createProjectMutation = useCreateMasterDataProject();
  const updateProjectMutation = useUpdateMasterDataProject();
  const toggleProjectMutation = useToggleMasterDataProject();
  const createDefinitionMutation = useCreateMasterDataDefinition();
  const updateDefinitionMutation = useUpdateMasterDataDefinition();
  const toggleDefinitionMutation = useToggleMasterDataDefinition();
  const deleteDefinitionMutation = useDeleteMasterDataDefinition();
  const createRecordMutation = useCreateMasterDataRecord();
  const updateRecordMutation = useUpdateMasterDataRecord();
  const deleteRecordMutation = useDeleteMasterDataRecord();
  const uploadCsvMutation = useUploadMasterDataCsv();
  const createSubDepartmentMutation = useCreateSubDepartment();

  const [projectDialogVisible, setProjectDialogVisible] = useState(false);
  const [definitionDialogVisible, setDefinitionDialogVisible] = useState(false);
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [subDepartmentDialogVisible, setSubDepartmentDialogVisible] = useState(false);

  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingDefinition, setEditingDefinition] = useState<MasterDataDefinition | null>(null);
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [definitionForm, setDefinitionForm] = useState<DefinitionFormState>(
    emptyDefinitionForm(null),
  );
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm());
  const [subDepartmentForm, setSubDepartmentForm] = useState({
    departmentId: '',
    name: '',
    code: '',
    isActive: true,
  });

  const definitionDepartmentId = Number(definitionForm.defaultDepartmentId || 0) || undefined;
  const recordDepartmentId = Number(recordForm.departmentId || 0) || undefined;
  const { data: definitionSubDepartments = [] } = useSubDepartments(definitionDepartmentId);
  const { data: recordSubDepartments = [] } = useSubDepartments(recordDepartmentId);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === effectiveProjectId) || null,
    [effectiveProjectId, projects],
  );

  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.id === effectiveDefinitionId) || null,
    [definitions, effectiveDefinitionId],
  );

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        label: `${project.name} (${project.code})`,
        value: project.id,
      })),
    [projects],
  );

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((department) => department.isActive)
        .map((department) => ({ label: department.name, value: department.id })),
    [departments],
  );

  const parentOptions = useMemo(
    () =>
      (selectedDefinitionDetail?.records || [])
        .filter((record) => record.id !== editingRecord?.id)
        .map((record) => ({
          label: `${record.name} (${record.code})`,
          value: record.id,
        })),
    [editingRecord?.id, selectedDefinitionDetail?.records],
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

  const openProjectDialog = (project?: MasterDataProject | null) => {
    if (project) {
      setEditingProjectId(project.id);
      setProjectForm({
        name: project.name,
        code: project.code,
        description: project.description || '',
        isActive: project.isActive,
      });
    } else {
      setEditingProjectId(null);
      setProjectForm({ name: '', code: '', description: '', isActive: true });
    }
    setProjectDialogVisible(true);
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
        mapDepartment: definition.mapDepartment,
        mapSubDepartment: definition.mapSubDepartment,
        defaultDepartmentId: definition.defaultDepartmentId ? String(definition.defaultDepartmentId) : '',
        defaultSubDepartmentId: definition.defaultSubDepartmentId ? String(definition.defaultSubDepartmentId) : '',
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

    if (record) {
      setEditingRecord(record);
      setRecordForm({
        code: record.code,
        name: record.name,
        description: record.description || '',
        parentId: record.parent_id ? String(record.parent_id) : '',
        validFrom: record.valid_from ? String(record.valid_from).slice(0, 10) : '',
        validTo: record.valid_to ? String(record.valid_to).slice(0, 10) : '',
        departmentId: record.department_id ? String(record.department_id) : '',
        subDepartmentId: record.sub_department_id ? String(record.sub_department_id) : '',
        sortOrder: String(record.sort_order ?? 0),
        metadata: JSON.stringify(record.metadata || {}, null, 2),
        isActive: record.is_active,
      });
    } else {
      setEditingRecord(null);
      setRecordForm(emptyRecordForm());
    }
    setRecordDialogVisible(true);
  };

  const openSubDepartmentDialog = () => {
    const departmentId = definitionForm.defaultDepartmentId || recordForm.departmentId;
    setSubDepartmentForm({
      departmentId: departmentId || '',
      name: '',
      code: '',
      isActive: true,
    });
    setSubDepartmentDialogVisible(true);
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
      const payload = {
        projectId: Number(definitionForm.projectId),
        name: definitionForm.name,
        code: definitionForm.code,
        description: definitionForm.description || undefined,
        supportsHierarchy: definitionForm.supportsHierarchy,
        hasValidityPeriod: definitionForm.hasValidityPeriod,
        mapDepartment: definitionForm.mapDepartment,
        mapSubDepartment: definitionForm.mapSubDepartment,
        defaultDepartmentId: definitionForm.defaultDepartmentId ? Number(definitionForm.defaultDepartmentId) : undefined,
        defaultSubDepartmentId: definitionForm.defaultSubDepartmentId ? Number(definitionForm.defaultSubDepartmentId) : undefined,
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
      const payload = {
        code: recordForm.code,
        name: recordForm.name,
        description: recordForm.description || undefined,
        parentId: recordForm.parentId ? Number(recordForm.parentId) : undefined,
        validFrom: recordForm.validFrom || undefined,
        validTo: recordForm.validTo || undefined,
        departmentId: recordForm.departmentId ? Number(recordForm.departmentId) : undefined,
        subDepartmentId: recordForm.subDepartmentId ? Number(recordForm.subDepartmentId) : undefined,
        sortOrder: Number(recordForm.sortOrder || 0),
        metadata: recordForm.metadata ? JSON.parse(recordForm.metadata) : {},
        isActive: recordForm.isActive,
      };

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

  const handleSubDepartmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await createSubDepartmentMutation.mutateAsync({
        departmentId: Number(subDepartmentForm.departmentId),
        name: subDepartmentForm.name,
        code: subDepartmentForm.code || undefined,
        isActive: subDepartmentForm.isActive,
      });

      if (definitionForm.defaultDepartmentId === subDepartmentForm.departmentId) {
        setDefinitionForm((prev) => ({ ...prev, defaultSubDepartmentId: String(created.id) }));
      }
      if (recordForm.departmentId === subDepartmentForm.departmentId) {
        setRecordForm((prev) => ({ ...prev, subDepartmentId: String(created.id) }));
      }

      setSubDepartmentDialogVisible(false);
      showToast('success', 'Sub-Department Created', 'Sub-department created successfully.');
    } catch (error: unknown) {
      showToast('error', 'Sub-Department Error', getErrorMessage(error, 'Unable to create sub-department.'));
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
      <Button label="Add Project" icon="pi pi-briefcase" onClick={() => openProjectDialog()} />
      <Button label="Add Master" icon="pi pi-plus" severity="success" onClick={() => openDefinitionDialog()} />
      <Button
        label="Add Record"
        icon="pi pi-sitemap"
        severity="help"
        onClick={() => openRecordDialog()}
        disabled={!effectiveDefinitionId}
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
                {selectedProject && (
                  <Button icon="pi pi-pencil" text rounded onClick={() => openProjectDialog(selectedProject)} />
                )}
              </div>
              <div className="d-flex flex-column gap-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`text-start border rounded-3 p-3 bg-white ${effectiveProjectId === project.id ? 'border-primary shadow-sm' : 'border-light'}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">{project.name}</div>
                        <small className="text-muted">{project.code}</small>
                      </div>
                      <Tag value={project.isActive ? 'Active' : 'Inactive'} severity={project.isActive ? 'success' : 'danger'} />
                    </div>
                    <div className="text-muted small mt-2">{project.schemaName}</div>
                    <div className="small mt-2">{project.definitionCount} master definition(s)</div>
                    <div className="d-flex gap-2 mt-3">
                      <Button icon="pi pi-pencil" text rounded onClick={(event) => { event.stopPropagation(); openProjectDialog(project); }} />
                      <Button
                        icon={project.isActive ? 'pi pi-eye-slash' : 'pi pi-check'}
                        text
                        rounded
                        severity={project.isActive ? 'warning' : 'success'}
                        onClick={async (event) => {
                          event.stopPropagation();
                          await toggleProjectMutation.mutateAsync(project.id);
                          showToast('success', 'Project Updated', `Project ${project.isActive ? 'deactivated' : 'activated'} successfully.`);
                        }}
                      />
                    </div>
                  </button>
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
                      {definition.mapDepartment && <Tag value="Department" severity="success" />}
                      {definition.mapSubDepartment && <Tag value="Sub-Dept" severity="success" />}
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="h5 mb-1">Record Hierarchy</h2>
              <div className="text-muted small">
                {selectedDefinition
                  ? `${selectedDefinition.name} in ${selectedDefinition.schemaName}.${selectedDefinition.tableName}`
                  : 'Select a master definition to manage records'}
              </div>
            </div>
            {selectedDefinitionDetail?.uploadBatches?.length ? (
              <Tag value={`Last upload: ${selectedDefinitionDetail.uploadBatches[0].status}`} severity="info" />
            ) : null}
          </div>

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
        </div>
      </div>

      <Dialog visible={projectDialogVisible} onHide={() => setProjectDialogVisible(false)} header={editingProjectId ? 'Edit Project' : 'Add Project'} modal style={{ width: '36rem' }}>
        <form onSubmit={handleProjectSubmit} className="d-flex flex-column gap-3">
          <span>
            <label className="form-label">Project Name</label>
            <InputText className="w-100" value={projectForm.name} onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </span>
          <span>
            <label className="form-label">Project Code</label>
            <InputText className="w-100" value={projectForm.code} onChange={(event) => setProjectForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))} required disabled={!!editingProjectId} />
          </span>
          <span>
            <label className="form-label">Description</label>
            <InputTextarea className="w-100" rows={3} value={projectForm.description} onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))} />
          </span>
          <label className="form-check">
            <input className="form-check-input" type="checkbox" checked={projectForm.isActive} onChange={(event) => setProjectForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            <span className="form-check-label">Active project</span>
          </label>
          <Button label={editingProjectId ? 'Update Project' : 'Create Project'} type="submit" loading={createProjectMutation.isPending || updateProjectMutation.isPending} />
        </form>
      </Dialog>

      <Dialog visible={definitionDialogVisible} onHide={() => setDefinitionDialogVisible(false)} header={editingDefinition ? 'Edit Master Definition' : 'Create Master Definition'} modal style={{ width: '48rem' }}>
        <form onSubmit={handleDefinitionSubmit} className="d-flex flex-column gap-3">
          <span>
            <label className="form-label">Project</label>
            <Dropdown className="w-100" value={Number(definitionForm.projectId || 0) || null} options={projectOptions} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, projectId: String(event.value || '') }))} placeholder="Select project" disabled={!!editingDefinition} />
          </span>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Master Name</label>
              <InputText className="w-100" value={definitionForm.name} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, name: event.target.value }))} required />
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
            <div className="col-md-6"><label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.mapDepartment} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, mapDepartment: event.target.checked, mapSubDepartment: event.target.checked ? prev.mapSubDepartment : false, defaultDepartmentId: event.target.checked ? prev.defaultDepartmentId : '', defaultSubDepartmentId: event.target.checked ? prev.defaultSubDepartmentId : '' }))} /><span className="form-check-label">Map department</span></label></div>
            <div className="col-md-6"><label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.mapSubDepartment} disabled={!definitionForm.mapDepartment} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, mapSubDepartment: event.target.checked, defaultSubDepartmentId: event.target.checked ? prev.defaultSubDepartmentId : '' }))} /><span className="form-check-label">Map sub-department</span></label></div>
          </div>
          {definitionForm.hasValidityPeriod && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Valid From</label><InputText type="date" className="w-100" value={definitionForm.validFrom} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, validFrom: event.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Valid To</label><InputText type="date" className="w-100" value={definitionForm.validTo} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, validTo: event.target.value }))} /></div>
            </div>
          )}
          {definitionForm.mapDepartment && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Default Department</label><Dropdown className="w-100" value={Number(definitionForm.defaultDepartmentId || 0) || null} options={departmentOptions} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, defaultDepartmentId: String(event.value || ''), defaultSubDepartmentId: '' }))} placeholder="Select department" showClear /></div>
              <div className="col-md-6"><label className="form-label">Default Sub-Department</label><div className="d-flex gap-2"><Dropdown className="w-100" value={Number(definitionForm.defaultSubDepartmentId || 0) || null} options={definitionSubDepartments.map((item) => ({ label: item.name, value: item.id }))} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, defaultSubDepartmentId: String(event.value || '') }))} placeholder="Select sub-department" showClear disabled={!definitionForm.mapSubDepartment} /><Button type="button" icon="pi pi-plus" outlined onClick={openSubDepartmentDialog} disabled={!definitionForm.defaultDepartmentId} /></div></div>
            </div>
          )}
          <label className="form-check"><input className="form-check-input" type="checkbox" checked={definitionForm.isActive} onChange={(event) => setDefinitionForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span className="form-check-label">Active definition</span></label>
          <Button label={editingDefinition ? 'Update Definition' : 'Create Definition'} type="submit" loading={createDefinitionMutation.isPending || updateDefinitionMutation.isPending} />
        </form>
      </Dialog>

      <Dialog visible={recordDialogVisible} onHide={() => setRecordDialogVisible(false)} header={editingRecord ? 'Edit Record' : 'Add Record'} modal style={{ width: '46rem' }}>
        <form onSubmit={handleRecordSubmit} className="d-flex flex-column gap-3">
          <div className="row g-3">
            <div className="col-md-6"><label className="form-label">Code</label><InputText className="w-100" value={recordForm.code} onChange={(event) => setRecordForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))} required /></div>
            <div className="col-md-6"><label className="form-label">Name</label><InputText className="w-100" value={recordForm.name} onChange={(event) => setRecordForm((prev) => ({ ...prev, name: event.target.value }))} required /></div>
          </div>
          <span><label className="form-label">Description</label><InputTextarea className="w-100" rows={2} value={recordForm.description} onChange={(event) => setRecordForm((prev) => ({ ...prev, description: event.target.value }))} /></span>
          {selectedDefinition?.supportsHierarchy && <span><label className="form-label">Parent</label><Dropdown className="w-100" value={Number(recordForm.parentId || 0) || null} options={parentOptions} onChange={(event) => setRecordForm((prev) => ({ ...prev, parentId: String(event.value || '') }))} placeholder="Root record" showClear /></span>}
          {selectedDefinition?.hasValidityPeriod && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Valid From</label><InputText type="date" className="w-100" value={recordForm.validFrom} onChange={(event) => setRecordForm((prev) => ({ ...prev, validFrom: event.target.value }))} /></div>
              <div className="col-md-6"><label className="form-label">Valid To</label><InputText type="date" className="w-100" value={recordForm.validTo} onChange={(event) => setRecordForm((prev) => ({ ...prev, validTo: event.target.value }))} /></div>
            </div>
          )}
          {selectedDefinition?.mapDepartment && (
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Department</label><Dropdown className="w-100" value={Number(recordForm.departmentId || 0) || null} options={departmentOptions} onChange={(event) => setRecordForm((prev) => ({ ...prev, departmentId: String(event.value || ''), subDepartmentId: '' }))} placeholder="Select department" showClear /></div>
              <div className="col-md-6"><label className="form-label">Sub-Department</label><div className="d-flex gap-2"><Dropdown className="w-100" value={Number(recordForm.subDepartmentId || 0) || null} options={recordSubDepartments.map((item) => ({ label: item.name, value: item.id }))} onChange={(event) => setRecordForm((prev) => ({ ...prev, subDepartmentId: String(event.value || '') }))} placeholder="Select sub-department" showClear disabled={!selectedDefinition?.mapSubDepartment} /><Button type="button" icon="pi pi-plus" outlined onClick={openSubDepartmentDialog} disabled={!recordForm.departmentId} /></div></div>
            </div>
          )}
          <div className="row g-3">
            <div className="col-md-4"><label className="form-label">Sort Order</label><InputText className="w-100" type="number" value={recordForm.sortOrder} onChange={(event) => setRecordForm((prev) => ({ ...prev, sortOrder: event.target.value }))} /></div>
            <div className="col-md-8"><label className="form-label">Metadata JSON</label><InputTextarea className="w-100" rows={4} value={recordForm.metadata} onChange={(event) => setRecordForm((prev) => ({ ...prev, metadata: event.target.value }))} /></div>
          </div>
          <label className="form-check"><input className="form-check-input" type="checkbox" checked={recordForm.isActive} onChange={(event) => setRecordForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span className="form-check-label">Active record</span></label>
          <Button label={editingRecord ? 'Update Record' : 'Create Record'} type="submit" loading={createRecordMutation.isPending || updateRecordMutation.isPending} />
        </form>
      </Dialog>

      <Dialog visible={subDepartmentDialogVisible} onHide={() => setSubDepartmentDialogVisible(false)} header="Create Sub-Department" modal style={{ width: '34rem' }}>
        <form onSubmit={handleSubDepartmentSubmit} className="d-flex flex-column gap-3">
          <span><label className="form-label">Department</label><Dropdown className="w-100" value={Number(subDepartmentForm.departmentId || 0) || null} options={departmentOptions} onChange={(event) => setSubDepartmentForm((prev) => ({ ...prev, departmentId: String(event.value || '') }))} placeholder="Select department" required /></span>
          <span><label className="form-label">Name</label><InputText className="w-100" value={subDepartmentForm.name} onChange={(event) => setSubDepartmentForm((prev) => ({ ...prev, name: event.target.value }))} required /></span>
          <span><label className="form-label">Code</label><InputText className="w-100" value={subDepartmentForm.code} onChange={(event) => setSubDepartmentForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))} /></span>
          <label className="form-check"><input className="form-check-input" type="checkbox" checked={subDepartmentForm.isActive} onChange={(event) => setSubDepartmentForm((prev) => ({ ...prev, isActive: event.target.checked }))} /><span className="form-check-label">Active sub-department</span></label>
          <Button label="Create Sub-Department" type="submit" loading={createSubDepartmentMutation.isPending} />
        </form>
      </Dialog>
    </div>
  );
};
