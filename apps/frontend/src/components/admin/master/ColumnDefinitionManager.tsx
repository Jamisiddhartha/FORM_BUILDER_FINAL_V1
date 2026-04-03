'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import {
  useCreateMasterColumnDefinition,
  useUpdateMasterColumnDefinition,
  useDeleteMasterColumnDefinition,
} from '@/hooks/master/useMasterDataManagementV2';

export interface ColumnDefinition {
  id?: number;
  columnKey: string;
  columnLabel: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isListable: boolean;
  isFilterable: boolean;
  displayOrder: number;
  placeholder?: string;
  defaultValue?: string;
  options?: {
    source?: 'MASTER' | 'STATIC';
    master_code?: string;
    value_col?: string;
    label_col?: string;
    filter_by?: string;
    items?: Array<{ label: string; value: any }>;
  };
}

interface ColumnDefinitionManagerProps {
  masterId: number | null;
  columns: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

const DATA_TYPES = [
  { label: 'Text', value: 'TEXT' },
  { label: 'Number', value: 'NUMBER' },
  { label: 'Date', value: 'DATE' },
  { label: 'Boolean', value: 'BOOLEAN' },
  { label: 'Select', value: 'SELECT' },
  { label: 'Multi-Select', value: 'MULTI_SELECT' },
  { label: 'File', value: 'FILE' },
  { label: 'Textarea', value: 'TEXTAREA' },
];

const emptyColumn = (): ColumnDefinition => ({
  columnKey: '',
  columnLabel: '',
  dataType: 'TEXT',
  isRequired: false,
  isUnique: false,
  isSearchable: true,
  isListable: true,
  isFilterable: true,
  displayOrder: 0,
  placeholder: '',
  defaultValue: '',
});

export const ColumnDefinitionManager: React.FC<ColumnDefinitionManagerProps> = ({
  masterId,
  columns,
  isLoading,
  onRefresh,
}) => {
  const toastRef = useRef<Toast | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | null>(null);
  const [formData, setFormData] = useState<ColumnDefinition>(emptyColumn());
  const [optionsSource, setOptionsSource] = useState<'MASTER' | 'STATIC' | null>(null);

  const createMutation = useCreateMasterColumnDefinition();
  const updateMutation = useUpdateMasterColumnDefinition();
  const deleteMutation = useDeleteMasterColumnDefinition();

  const showToast = (severity: 'success' | 'error' | 'info', summary: string, detail: string) => {
    toastRef.current?.show({ severity, summary, detail });
  };

  const openDialog = (column?: any) => {
    if (column) {
      setEditingColumn(column);
      setFormData(column);
      setOptionsSource((column.options?.source as 'MASTER' | 'STATIC') || null);
    } else {
      setEditingColumn(null);
      setFormData(emptyColumn());
      setOptionsSource(null);
    }
    setDialogVisible(true);
  };

  const handleSubmit = async () => {
    if (!masterId) {
      showToast('error', 'Error', 'Master not selected');
      return;
    }

    if (!formData.columnKey || !formData.columnLabel) {
      showToast('error', 'Validation', 'Column Key and Label are required');
      return;
    }

    try {
      if (editingColumn?.id) {
        await updateMutation.mutateAsync({
          columnId: editingColumn.id,
          data: formData,
        });
        showToast('success', 'Updated', 'Column definition updated successfully');
      } else {
        await createMutation.mutateAsync({
          masterId,
          ...formData,
        });
        showToast('success', 'Created', 'Column definition created successfully');
      }
      setDialogVisible(false);
      onRefresh();
    } catch (error: any) {
      showToast('error', 'Error', error.response?.data?.message || 'Failed to save column');
    }
  };

  const handleDelete = async (columnId: number) => {
    if (!confirm('Delete this column definition?')) return;

    try {
      await deleteMutation.mutateAsync(columnId);
      showToast('success', 'Deleted', 'Column definition deleted successfully');
      onRefresh();
    } catch (error: any) {
      showToast('error', 'Error', error.response?.data?.message || 'Failed to delete column');
    }
  };

  const actionBodyTemplate = (rowData: any) => (
    <div className="d-flex gap-2">
      <Button
        icon="pi pi-pencil"
        rounded
        text
        size="small"
        onClick={() => openDialog(rowData)}
      />
      <Button
        icon="pi pi-trash"
        rounded
        text
        size="small"
        severity="danger"
        onClick={() => handleDelete(rowData.id)}
      />
    </div>
  );

  const dataTypeTemplate = (rowData: any) => {
    const dataType = DATA_TYPES.find((t) => t.value === rowData.dataType);
    return <Tag value={dataType?.label || rowData.dataType} />;
  };

  const booleanTemplate = (rowData: any, field: keyof ColumnDefinition) => (
    <Checkbox checked={rowData[field] === true} disabled />
  );

  return (
    <div className="column-definition-manager">
      <Toast ref={toastRef} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Column Definitions</h5>
        <Button
          label="Add Column"
          icon="pi pi-plus"
          size="small"
          onClick={() => openDialog()}
          disabled={!masterId}
        />
      </div>

      <DataTable
        value={columns}
        loading={isLoading}
        emptyMessage="No columns defined yet"
        size="small"
        scrollable
        scrollHeight="400px"
      >
        <Column field="displayOrder" header="Order" width="60px" />
        <Column field="columnLabel" header="Label" />
        <Column field="columnKey" header="Key" />
        <Column field="dataType" header="Type" body={dataTypeTemplate} width="100px" />
        <Column
          field="isRequired"
          header="Required"
          body={(rowData) => booleanTemplate(rowData, 'isRequired')}
          width="80px"
        />
        <Column
          field="isUnique"
          header="Unique"
          body={(rowData) => booleanTemplate(rowData, 'isUnique')}
          width="80px"
        />
        <Column
          field="isSearchable"
          header="Searchable"
          body={(rowData) => booleanTemplate(rowData, 'isSearchable')}
          width="100px"
        />
        <Column
          body={actionBodyTemplate}
          header="Actions"
          width="100px"
          exportable={false}
        />
      </DataTable>

      <Dialog
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        header={editingColumn ? 'Edit Column' : 'Add Column'}
        modal
        style={{ width: '500px' }}
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label">Column Label *</label>
            <InputText
              className="w-100"
              value={formData.columnLabel}
              onChange={(e) => setFormData({ ...formData, columnLabel: e.target.value })}
              placeholder="e.g., Approval Type"
            />
          </div>

          <div>
            <label className="form-label">Column Key *</label>
            <InputText
              className="w-100"
              value={formData.columnKey}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  columnKey: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '_'),
                })
              }
              placeholder="e.g., approval_type"
              disabled={!!editingColumn}
            />
          </div>

          <div>
            <label className="form-label">Data Type *</label>
            <Dropdown
              className="w-100"
              value={formData.dataType}
              onChange={(e) => setFormData({ ...formData, dataType: e.value })}
              options={DATA_TYPES}
              optionLabel="label"
              optionValue="value"
            />
          </div>

          <div>
            <label className="form-label">Display Order</label>
            <InputNumber
              className="w-100"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData({ ...formData, displayOrder: e.value ?? 0 })
              }
            />
          </div>

          <div>
            <label className="form-label">Placeholder</label>
            <InputText
              className="w-100"
              value={formData.placeholder || ''}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              placeholder="e.g., Select an approval type"
            />
          </div>

          <div>
            <label className="form-label">Default Value</label>
            <InputText
              className="w-100"
              value={formData.defaultValue || ''}
              onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
            />
          </div>

          <div className="row g-2">
            <div className="col-6">
              <label className="form-check">
                <Checkbox
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.checked ?? false })}
                />
                <span className="form-check-label">Required</span>
              </label>
            </div>
            <div className="col-6">
              <label className="form-check">
                <Checkbox
                  checked={formData.isUnique}
                  onChange={(e) => setFormData({ ...formData, isUnique: e.checked ?? false })}
                />
                <span className="form-check-label">Unique</span>
              </label>
            </div>
            <div className="col-6">
              <label className="form-check">
                <Checkbox
                  checked={formData.isSearchable}
                  onChange={(e) =>
                    setFormData({ ...formData, isSearchable: e.checked ?? false })
                  }
                />
                <span className="form-check-label">Searchable</span>
              </label>
            </div>
            <div className="col-6">
              <label className="form-check">
                <Checkbox
                  checked={formData.isListable}
                  onChange={(e) => setFormData({ ...formData, isListable: e.checked ?? false })}
                />
                <span className="form-check-label">Listable</span>
              </label>
            </div>
            <div className="col-6">
              <label className="form-check">
                <Checkbox
                  checked={formData.isFilterable}
                  onChange={(e) =>
                    setFormData({ ...formData, isFilterable: e.checked ?? false })
                  }
                />
                <span className="form-check-label">Filterable</span>
              </label>
            </div>
          </div>

          {/* Options Configuration for SELECT/MULTI_SELECT */}
          {(formData.dataType === 'SELECT' || formData.dataType === 'MULTI_SELECT') && (
            <div className="border-top pt-3 mt-3">
              <h6 className="mb-3">
                <i className="pi pi-cog me-2"></i>
                Options Configuration
              </h6>

              <div>
                <label className="form-label">Options Source *</label>
                <Dropdown
                  className="w-100"
                  value={optionsSource}
                  onChange={(e) => {
                    setOptionsSource(e.value);
                    setFormData({
                      ...formData,
                      options: {
                        ...(formData.options || {}),
                        source: e.value,
                      },
                    });
                  }}
                  options={[
                    { label: 'Master Data', value: 'MASTER' },
                    { label: 'Static List', value: 'STATIC' },
                  ]}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select source type"
                />
              </div>

              {optionsSource === 'MASTER' && (
                <div className="mt-3">
                  <div>
                    <label className="form-label">Master Code *</label>
                    <InputText
                      className="w-100"
                      value={formData.options?.master_code || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          options: {
                            ...(formData.options || {}),
                            master_code: e.target.value.toUpperCase().replace(/[^A-Z_0-9]/g, '_'),
                          },
                        })
                      }
                      placeholder="e.g., COUNTRY, STATE, DISTRICT"
                    />
                    <small className="text-muted">The code of the master to fetch options from</small>
                  </div>

                  <div className="row g-2 mt-2">
                    <div className="col-md-6">
                      <label className="form-label">Value Column</label>
                      <InputText
                        className="w-100"
                        value={formData.options?.value_col || 'id'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            options: {
                              ...(formData.options || {}),
                              value_col: e.target.value,
                            },
                          })
                        }
                        placeholder="id"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Label Column</label>
                      <InputText
                        className="w-100"
                        value={formData.options?.label_col || 'name'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            options: {
                              ...(formData.options || {}),
                              label_col: e.target.value,
                            },
                          })
                        }
                        placeholder="name"
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="form-label">Filter By Column (Cascading)</label>
                    <InputText
                      className="w-100"
                      value={formData.options?.filter_by || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          options: {
                            ...(formData.options || {}),
                            filter_by: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="e.g., country_id (leave empty if not cascading)"
                    />
                    <small className="text-muted">Column to filter by (for hierarchical selection)</small>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="d-flex gap-2 justify-content-end mt-4">
            <Button
              label="Cancel"
              severity="secondary"
              onClick={() => setDialogVisible(false)}
            />
            <Button
              label={editingColumn ? 'Update' : 'Create'}
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
