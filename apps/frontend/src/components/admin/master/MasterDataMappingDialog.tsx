'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useCreateMasterDataReference, useDeleteMasterDataReference } from '@/hooks/master/useMasterDataManagementV2';

interface MasterDataMappingDialogProps {
  visible: boolean;
  onHide: () => void;
  masterId: number | null;
  masterCode: string;
  masterData: any[];
  allMasters: any[];
}

export const MasterDataMappingDialog: React.FC<MasterDataMappingDialogProps> = ({
  visible,
  onHide,
  masterId,
  masterCode,
  masterData,
  allMasters,
}) => {
  const toastRef = useRef<Toast | null>(null);
  const [selectedFromRecord, setSelectedFromRecord] = useState<any>(null);
  const [selectedToMaster, setSelectedToMaster] = useState<any>(null);
  const [selectedToRecord, setSelectedToRecord] = useState<any>(null);
  const [columnKey, setColumnKey] = useState('');
  const [toMasterRecords, setToMasterRecords] = useState<any[]>([]);

  const createMutation = useCreateMasterDataReference();
  const deleteMutation = useDeleteMasterDataReference();

  const showToast = (severity: 'success' | 'error' | 'info', summary: string, detail: string) => {
    toastRef.current?.show({ severity, summary, detail });
  };

  const handleToMasterChange = (master: any) => {
    setSelectedToMaster(master);
    // Filter records for the selected "to" master
    const records = masterData.filter((record) => record.master?.code === master.code);
    setToMasterRecords(records);
    setSelectedToRecord(null);
  };

  const handleCreateMapping = async () => {
    if (!selectedFromRecord || !selectedToRecord || !columnKey) {
      showToast('error', 'Validation', 'Please fill in all fields: From Record, To Master, To Record, and Column Key');
      return;
    }

    try {
      await createMutation.mutateAsync({
        fromDataId: String(selectedFromRecord.id),
        toDataId: String(selectedToRecord.id),
        columnKey: columnKey,
        masterId: masterId || 0,
      });

      showToast('success', 'Created', 'Mapping created successfully');
      resetForm();
    } catch (error: any) {
      showToast('error', 'Error', error.response?.data?.message || 'Failed to create mapping');
    }
  };

  const resetForm = () => {
    setSelectedFromRecord(null);
    setSelectedToMaster(null);
    setSelectedToRecord(null);
    setColumnKey('');
    setToMasterRecords([]);
  };

  const handleDeleteMapping = async (mapping: any) => {
    if (!confirm('Delete this mapping?')) return;

    try {
      await deleteMutation.mutateAsync({
        id: mapping.id,
        masterId: masterId || 0,
      });
      showToast('success', 'Deleted', 'Mapping deleted successfully');
    } catch (error: any) {
      showToast('error', 'Error', error.response?.data?.message || 'Failed to delete mapping');
    }
  };

  // Get mappings for current master
  const currentMappings = selectedFromRecord?.references || [];

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={`Create Master Data Mapping - ${masterCode}`}
      modal
      style={{ width: '800px' }}
      maximizable
    >
      <Toast ref={toastRef} />

      <div className="d-flex flex-column gap-3">
        {/* Create Mapping Section */}
        <div className="border-bottom pb-3 mb-3">
          <h6 className="mb-3">
            <i className="pi pi-link me-2"></i>
            Create New Mapping
          </h6>

          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">
                From Record ({masterCode}) *
              </label>
              <Dropdown
                className="w-100"
                value={selectedFromRecord}
                onChange={(e) => setSelectedFromRecord(e.value)}
                options={masterData}
                optionLabel={(option) => `${option.name || option.code} (ID: ${option.id})`}
                optionValue={(option) => option}
                placeholder="Select a record"
                filter
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">To Master *</label>
              <Dropdown
                className="w-100"
                value={selectedToMaster}
                onChange={(e) => handleToMasterChange(e.value)}
                options={allMasters.filter((m) => m.code !== masterCode)}
                optionLabel="code"
                optionValue={(option) => option}
                placeholder="Select master"
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">To Record *</label>
              <Dropdown
                className="w-100"
                value={selectedToRecord}
                onChange={(e) => setSelectedToRecord(e.value)}
                options={toMasterRecords}
                optionLabel={(option) => `${option.name || option.code} (ID: ${option.id})`}
                optionValue={(option) => option}
                placeholder="Select a record"
                filter
                disabled={!selectedToMaster || toMasterRecords.length === 0}
              />
              {selectedToMaster && toMasterRecords.length === 0 && (
                <small className="text-warning">No records found for selected master</small>
              )}
            </div>

            <div className="col-md-6">
              <label className="form-label">Column Key *</label>
              <InputText
                className="w-100"
                value={columnKey}
                onChange={(e) => setColumnKey(e.target.value)}
                placeholder="e.g., country_id, district_id"
              />
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-end mt-3">
            <Button
              label="Cancel"
              severity="secondary"
              size="small"
              onClick={resetForm}
            />
            <Button
              label="Create Mapping"
              size="small"
              onClick={handleCreateMapping}
              loading={createMutation.isPending}
              icon="pi pi-plus"
            />
          </div>
        </div>

        {/* Existing Mappings Section */}
        {selectedFromRecord && (
          <div>
            <h6 className="mb-3">
              <i className="pi pi-list me-2"></i>
              Mappings for {selectedFromRecord.name || selectedFromRecord.code} (ID: {selectedFromRecord.id})
            </h6>

            {currentMappings.length > 0 ? (
              <DataTable value={currentMappings} size="small" scrollable>
                <Column
                  field="toData.master.code"
                  header="To Master"
                  body={(row) => (
                    <Tag value={row.toData?.master?.code} style={{ backgroundColor: '#3498db' }} />
                  )}
                />
                <Column
                  field="toData.name"
                  header="To Record"
                  body={(row) => row.toData?.name || row.toData?.code}
                />
                <Column
                  field="toData.id"
                  header="To Record ID"
                  body={(row) => <code>{row.toData?.id}</code>}
                />
                <Column
                  field="columnKey"
                  header="Column Key"
                  body={(row) => <Tag value={row.columnKey} />}
                />
                <Column
                  field="createdAt"
                  header="Created"
                  body={(row) => new Date(row.createdAt).toLocaleDateString()}
                  width="120px"
                />
                <Column
                  header="Actions"
                  body={(row) => (
                    <Button
                      icon="pi pi-trash"
                      rounded
                      text
                      size="small"
                      severity="danger"
                      onClick={() => handleDeleteMapping(row)}
                      loading={deleteMutation.isPending}
                    />
                  )}
                  width="80px"
                />
              </DataTable>
            ) : (
              <div className="text-center text-muted py-3">
                <i className="pi pi-inbox" style={{ fontSize: '2rem' }}></i>
                <p className="mt-2">No mappings found for this record</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
