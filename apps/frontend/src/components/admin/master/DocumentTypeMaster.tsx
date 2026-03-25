'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Toolbar } from 'primereact/toolbar';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import {
  useDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
  useToggleDocumentType,
} from '@/hooks/master/useDocumentTypes';
import { useDataTableManager } from '@/hooks/useDataTableManager';
import { ReusableDataTable } from '@/components/DataTable/ReusableDataTable';
import { ReusableDataTableConfig, RowAction } from '@/components/DataTable/types';
import { useExportHandler } from '@/hooks/useExportHandler';
import { documentTypeExportConfig } from '@/lib/export-configs';

interface DocumentType {
  id: number;
  name: string;
  abbreviation: string;
  isDocActive: boolean;
  isFormatRequired?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DocumentTypeMaster = () => {
  const { data: documentTypes = [], isLoading } = useDocumentTypes();
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();
  const toggleMutation = useToggleDocumentType();

  const toastRef = useRef<Toast>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    isDocActive: true,
    isFormatRequired: false,
  });

  const {
    data: tableData,
    selectedRows,
    filteredData,
    filters,
    globalFilter,
    handleSelectionChange,
    handleGlobalFilterChange,
    handleFiltersChange,
    clearFilters,
  } = useDataTableManager<DocumentType>(documentTypes);

  // Use export handler hook
  const { handleExportCSV, handleExportExcel, handleExportPDF } = useExportHandler(
    documentTypeExportConfig,
    toastRef as React.RefObject<Toast>
  );

  // Memoized table config
  const tableConfig: ReusableDataTableConfig<DocumentType> = useMemo(
    () => ({
      columns: [
        { field: 'id', header: 'ID', width: '5%', filterType: 'none' },
        {
          field: 'name',
          header: 'Document Type Name',
          width: '35%',
          filterType: 'text',
          body: (row) => <span className="font-semibold">{row.name}</span>,
        },
        {
          field: 'abbreviation',
          header: 'Abbreviation',
          width: '15%',
          filterType: 'text',
          body: (row) => <span className="badge bg-primary">{row.abbreviation}</span>,
        },
        {
          field: 'isFormatRequired',
          header: 'Format Required',
          width: '12%',
          filterType: 'select',
          filterOptions: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
          body: (row) => (
            <Tag
              value={row.isFormatRequired === true ? 'Yes' : row.isFormatRequired === false ? 'No' : 'N/A'}
              severity={row.isFormatRequired === true ? 'success' : 'info'}
            />
          ),
        },
        {
          field: 'isDocActive',
          header: 'Status',
          width: '12%',
          filterType: 'select',
          filterOptions: [
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ],
          body: (row) => (
            <Tag value={row.isDocActive ? 'Active' : 'Inactive'} severity={row.isDocActive ? 'success' : 'danger'} />
          ),
        },
        {
          field: 'createdAt',
          header: 'Created Date',
          width: '15%',
          filterType: 'date',
          body: (row) => new Date(row.createdAt).toLocaleDateString(),
        },
      ],
      dataKey: 'id',
      rows: 10,
      rowsPerPageOptions: [5, 10, 25, 50],
      globalFilterFields: ['name', 'abbreviation'],
      selectable: true,
      selectionMode: 'multiple',
      paginator: true,
      stripedRows: true,
      showGridlines: true,
      emptyMessage: 'No document types found.',
    }),
    []
  );

  // Memoized row actions
  const rowActions: RowAction<DocumentType>[] = useMemo(
    () => [
      {
        icon: 'pi pi-pencil',
        label: 'Edit',
        severity: 'info',
        onClick: (documentType) => handleEdit(documentType),
        tooltip: 'Edit',
      },
      {
        icon: 'pi pi-check',
        label: 'Toggle',
        severity: 'success',
        onClick: (documentType) => handleToggle(documentType),
        tooltip: 'Toggle Status',
        visible: (documentType) => !documentType.isDocActive,
      },
      {
        icon: 'pi pi-times',
        label: 'Deactivate',
        severity: 'warn',
        onClick: (documentType) => handleToggle(documentType),
        tooltip: 'Deactivate',
        visible: (documentType) => documentType.isDocActive,
      },
      {
        icon: 'pi pi-trash',
        label: 'Delete',
        severity: 'error',
        onClick: (documentType) => handleDelete(documentType),
        tooltip: 'Delete',
      },
    ],
    []
  );

  const handleInputChange = useCallback((e: any) => {
    const { name, value, type, checked } = e.target || e;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const submitData = {
          name: formData.name,
          abbreviation: formData.abbreviation,
          isDocActive: formData.isDocActive,
          isFormatRequired: formData.isFormatRequired || null,
        };

        if (editingId) {
          await updateMutation.mutateAsync({ id: editingId, data: submitData });
          toastRef.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Document Type updated successfully',
          });
        } else {
          await createMutation.mutateAsync(submitData);
          toastRef.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Document Type created successfully',
          });
        }
        resetForm();
        setShowDialog(false);
      } catch (err: any) {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: err.response?.data?.message || 'Error saving document type',
        });
      }
    },
    [formData, editingId, createMutation, updateMutation]
  );

  const handleEdit = useCallback((documentType: DocumentType) => {
    setFormData({
      name: documentType.name,
      abbreviation: documentType.abbreviation,
      isDocActive: documentType.isDocActive,
      isFormatRequired: documentType.isFormatRequired || false,
    });
    setEditingId(documentType.id);
    setShowDialog(true);
  }, []);

  const handleDelete = useCallback(
    async (documentType: DocumentType) => {
      if (confirm(`Are you sure you want to delete ${documentType.name}?`)) {
        try {
          await deleteMutation.mutateAsync(documentType.id);
          toastRef.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Document Type deleted successfully',
          });
        } catch (err: any) {
          toastRef.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Error deleting document type',
          });
        }
      }
    },
    [deleteMutation]
  );

  const handleToggle = useCallback(
    async (documentType: DocumentType) => {
      try {
        await toggleMutation.mutateAsync(documentType.id);
        toastRef.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: `Document Type ${documentType.isDocActive ? 'deactivated' : 'activated'} successfully`,
        });
      } catch (err: any) {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error updating document type status',
        });
      }
    },
    [toggleMutation]
  );

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      abbreviation: '',
      isDocActive: true,
      isFormatRequired: false,
    });
    setEditingId(null);
  }, []);

  // Wrapper functions for export with loading state
  const handleCSVExport = useCallback(async () => {
    setExporting(true);
    await handleExportCSV(filteredData);
    setExporting(false);
  }, [handleExportCSV, filteredData]);

  const handleExcelExport = useCallback(async () => {
    setExporting(true);
    await handleExportExcel(filteredData);
    setExporting(false);
  }, [handleExportExcel, filteredData]);

  const handlePDFExport = useCallback(async () => {
    setExporting(true);
    await handleExportPDF(filteredData);
    setExporting(false);
  }, [handleExportPDF, filteredData]);

  const leftToolbarTemplate = useCallback(
    () => (
      <Button
        label="Add Document Type"
        icon="pi pi-plus"
        severity="success"
        onClick={() => {
          resetForm();
          setShowDialog(true);
        }}
      />
    ),
    [resetForm]
  );

  const rightToolbarTemplate = useCallback(
    () => (
      <div className="d-flex gap-2">
        <Button
          label="Clear Filters"
          icon="pi pi-filter-slash"
          severity="secondary"
          outlined
          onClick={() => {
            clearFilters();
            handleGlobalFilterChange('');
            handleFiltersChange({});
          }}
        />
        <Button
          label="CSV"
          icon="pi pi-download"
          severity="info"
          rounded
          onClick={handleCSVExport}
          loading={exporting}
          disabled={isLoading}
        />
        <Button
          label="Excel"
          icon="pi pi-file-excel"
          severity="success"
          rounded
          onClick={handleExcelExport}
          loading={exporting}
          disabled={isLoading}
        />
        <Button
          label="PDF"
          icon="pi pi-file-pdf"
          severity="warning"
          rounded
          onClick={handlePDFExport}
          loading={exporting}
          disabled={isLoading}
        />
      </div>
    ),
    [
      exporting,
      isLoading,
      handleCSVExport,
      handleExcelExport,
      handlePDFExport,
      clearFilters,
      handleGlobalFilterChange,
      handleFiltersChange,
    ]
  );

  return (
    <div className="p-4">
      <Toast ref={toastRef} />
      <div className="mb-4">
        <h1 className="h2 mb-3">Document Type Master</h1>
        <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-3" />
      </div>

      <Dialog
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        header={editingId ? 'Edit Document Type' : 'Add New Document Type'}
        modal
        style={{ width: '50vw' }}
        breakpoints={{ '960px': '75vw', '640px': '90vw' }}
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Document Type Name *
            </label>
            <InputText
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter document type name"
              className="w-100"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="abbreviation" className="form-label">
              Abbreviation *
            </label>
            <InputText
              id="abbreviation"
              name="abbreviation"
              value={formData.abbreviation}
              onChange={handleInputChange}
              placeholder="e.g., DT-AP"
              className="w-100"
              required
            />
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                id="isDocActive"
                name="isDocActive"
                type="checkbox"
                className="form-check-input"
                checked={formData.isDocActive}
                onChange={handleInputChange}
              />
              <label className="form-check-label" htmlFor="isDocActive">
                Active
              </label>
            </div>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                id="isFormatRequired"
                name="isFormatRequired"
                type="checkbox"
                className="form-check-input"
                checked={formData.isFormatRequired}
                onChange={handleInputChange}
              />
              <label className="form-check-label" htmlFor="isFormatRequired">
                Format Required
              </label>
            </div>
          </div>

          <div className="d-flex gap-2">
            <Button
              label={editingId ? 'Update' : 'Create'}
              icon="pi pi-check"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              className="flex-grow-1"
            />
            <Button label="Cancel" icon="pi pi-times" severity="secondary" onClick={() => setShowDialog(false)} />
          </div>
        </form>
      </Dialog>

      <ReusableDataTable<DocumentType>
        data={tableData}
        config={tableConfig}
        loading={isLoading}
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onFiltersChange={handleFiltersChange}
        rowActions={rowActions}
        externalFilters={filters}
        externalGlobalFilter={globalFilter}
      />
    </div>
  );
};
