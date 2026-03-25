'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import apiClient from '@/lib/api-client';
import { ReusableDataTable } from '@/components/DataTable/ReusableDataTable';
import { DataTableColumnConfig } from '@/components/DataTable/types';
import { useDepartments } from '@/hooks/master/useDepartments';
import { useFormBuilderServices } from '@/hooks/master/useFormBuilderServices';
import { ManagePagesModal } from './formBuilder/ManagePagesModal';
import { AddFormTypeModal } from './formBuilder/AddFormTypeModal';
import { FbServiceRow } from '@/types/formBuilder';

const ui = {
  page: {
    display: 'grid',
    gap: 16,
  } as const,
  panel: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    padding: 16,
  } as const,
  muted: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 1.4,
  } as const,
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    border: '1px solid #dbe3ef',
    background: '#f8fafc',
    color: '#334155',
    fontSize: 12,
    padding: '4px 10px',
    fontWeight: 600,
  } as const,
  btnPrimary: {
    borderRadius: 999,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: '1px solid #1d4ed8',
    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.22)',
    fontWeight: 600,
  } as const,
  btnSecondary: {
    borderRadius: 999,
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
    fontWeight: 600,
  } as const,
  btnDanger: {
    borderRadius: 999,
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    color: '#be123c',
    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)',
    fontWeight: 600,
  } as const,
};

export function FormBuilderMaster() {
  const router = useRouter();
  const locale = useLocale();
  const toast = useRef<Toast>(null);
  const prefetchedBuilderRoutes = useRef<Set<string>>(new Set());

  const { data: departments } = useDepartments();
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const { data: rows = [], isLoading, refetch } = useFormBuilderServices(departmentId);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeService, setActiveService] = useState<{
    serviceId: string;
    formTypeId: number;
    formName: string;
  } | null>(null);

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addFormService, setAddFormService] = useState<{
    serviceId: string;
    existingFormTypeIds: number[];
    existingFormCodes: string[];
  } | null>(null);

  const deptOptions = useMemo(
    () =>
      (departments ?? []).map((d: any) => ({
        label: d.name,
        value: d.id,
      })),
    [departments],
  );

  const getBuilderHref = useCallback(
    (serviceId: string, formTypeId: number) =>
      `/${locale}/admin/master/form-builder/services/${encodeURIComponent(
        serviceId,
      )}/forms/${formTypeId}/builder`,
    [locale],
  );

  const prefetchBuilder = useCallback(
    (serviceId: string, formTypeId: number) => {
      const href = getBuilderHref(serviceId, formTypeId);
      if (prefetchedBuilderRoutes.current.has(href)) return;
      prefetchedBuilderRoutes.current.add(href);
      router.prefetch(href);
    },
    [getBuilderHref, router],
  );

  useEffect(() => {
    // Warm first few builder routes so "Open Builder" feels instant on first click.
    const firstRows = rows.slice(0, 5);
    firstRows.forEach((row) => {
      (row.forms ?? []).slice(0, 3).forEach((f) => prefetchBuilder(row.serviceId, f.formTypeId));
    });
  }, [rows, prefetchBuilder]);

  async function handleGenerateCertificate(serviceId: string) {
    toast.current?.show({
      severity: 'info',
      summary: 'Coming soon',
      detail: `Generate Certificate for Service ${serviceId} will be implemented later.`,
      life: 2500,
    });
  }

  async function deleteFormMapping(serviceId: string, formTypeId: number) {
    const ok = window.confirm('Are you sure you want to delete this Form Type mapping?');
    if (!ok) return;

    try {
      await apiClient.delete(`/master/form-builder/services/${serviceId}/forms/${formTypeId}`);
      toast.current?.show({
        severity: 'success',
        summary: 'Deleted',
        detail: 'Form type mapping deleted.',
        life: 2500,
      });
      await refetch();
    } catch (e: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Failed',
        detail: e?.response?.data?.message ?? 'Could not delete form mapping.',
        life: 3500,
      });
    }
  }

  const columns: DataTableColumnConfig<FbServiceRow>[] = [
    {
      field: 'serviceId',
      header: 'Service ID',
      filterType: 'text',
      body: (row: FbServiceRow) => (
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.serviceId}</div>
      ),
    },
    {
      field: 'serviceName',
      header: 'Service Name',
      filterType: 'text',
      body: (row: FbServiceRow) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.serviceName}</div>
          <div style={ui.muted}>Manage form types and page structures for this service.</div>
        </div>
      ),
    },
    {
      field: 'forms',
      header: 'Forms',
      filterType: 'none',
      body: (row: FbServiceRow) => {
        const forms = row.forms ?? [];
        const existingFormTypeIds = forms.map((f) => f.formTypeId);
        const existingFormCodes = forms
          .map((f) => f.formCode)
          .filter((code): code is string => typeof code === 'string' && code.trim().length > 0);

        return (
          <div style={{ display: 'grid', gap: 10, minWidth: 320 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={ui.badge}>
                  <i className="pi pi-file" style={{ fontSize: 11 }} />
                  {forms.length} Form{forms.length === 1 ? '' : 's'}
                </span>
                <span style={ui.badge}>
                  <i className="pi pi-briefcase" style={{ fontSize: 11 }} />
                  {row.serviceId}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  label="Add Form Type"
                  icon="pi pi-plus"
                  size="small"
                  style={ui.btnPrimary}
                  onClick={() => {
                    setAddFormService({
                      serviceId: row.serviceId,
                      existingFormTypeIds,
                      existingFormCodes,
                    });
                    setAddFormOpen(true);
                  }}
                />
                <Button
                  label="Generate Certificate"
                  icon="pi pi-file"
                  size="small"
                  severity="secondary"
                  style={ui.btnSecondary}
                  onClick={() => handleGenerateCertificate(row.serviceId)}
                />
              </div>
            </div>

            {forms.length === 0 ? (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 12,
                  padding: 14,
                  background: '#fff',
                  color: '#475569',
                  fontSize: 13,
                }}
              >
                No forms mapped yet for this service. Use <strong>Add Form Type</strong> to create one.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {forms.map((f) => (
                  <div
                    key={`${row.serviceId}-${f.formTypeId}`}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 12,
                      background: '#fff',
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 220, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                          {f.formName}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={ui.badge}>Type {f.formTypeId}</span>
                          <span style={ui.badge}>Pages {f.pagesCount}</span>
                          <span style={ui.badge}>Code {f.formCode || '-'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Button
                          label="Manage Pages"
                          icon="pi pi-sitemap"
                          size="small"
                          style={ui.btnPrimary}
                          onClick={() => {
                            setActiveService({
                              serviceId: row.serviceId,
                              formTypeId: f.formTypeId,
                              formName: f.formName,
                            });
                            setModalOpen(true);
                          }}
                        />
                        <Button
                          label="Open Builder"
                          icon="pi pi-pencil"
                          size="small"
                          severity="secondary"
                          style={ui.btnSecondary}
                          onMouseEnter={() => prefetchBuilder(row.serviceId, f.formTypeId)}
                          onFocus={() => prefetchBuilder(row.serviceId, f.formTypeId)}
                          onClick={() => {
                            router.push(getBuilderHref(row.serviceId, f.formTypeId));
                          }}
                        />
                        <Button
                          label="Delete"
                          icon="pi pi-trash"
                          size="small"
                          severity="danger"
                          style={ui.btnDanger}
                          onClick={() => deleteFormMapping(row.serviceId, f.formTypeId)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={ui.page}>
      <Toast ref={toast} />

      <section style={ui.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Form Builder</h3>
            <div style={{ ...ui.muted, marginTop: 4 }}>
              Manage service-level form types and page configurations from one place.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={ui.badge}>
              <i className="pi pi-building" style={{ fontSize: 11 }} />
              {departmentId ? `Department #${departmentId}` : 'All Departments'}
            </span>
            <span style={ui.badge}>
              <i className="pi pi-database" style={{ fontSize: 11 }} />
              {rows.length} Service{rows.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      <section style={ui.panel}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Department Filter</div>
          <div style={{ ...ui.muted, marginBottom: 10 }}>
            Select a department to reduce clutter and work on a focused set of services.
          </div>
          <Dropdown
            value={departmentId}
            options={deptOptions}
            onChange={(e) => setDepartmentId(e.value)}
            className="w-100"
            placeholder="Select Department"
            filter
            filterBy="label"
            showClear
          />
        </div>

        <div>
          
        </div>
      </section>

      <section style={ui.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 600, color: '#0f172a' }}>Services and Form Mappings</div>
          <div style={ui.muted}>
            {departmentId
              ? 'Showing services for the selected department.'
              : 'Showing all services. Use the filter above for a cleaner workflow.'}
          </div>
        </div>

        <ReusableDataTable<FbServiceRow>
          data={rows}
          loading={isLoading}
          config={{
            dataKey: 'id',
            columns,
            globalFilterFields: ['serviceId', 'serviceName'],
            rows: 10,
            rowsPerPageOptions: [10, 25, 50],
            stripedRows: true,
            showGridlines: false,
          }}
        />
      </section>

      {activeService && (
        <ManagePagesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          serviceId={activeService.serviceId}
          formTypeId={activeService.formTypeId}
          formName={activeService.formName}
        />
      )}

      {addFormService && (
        <AddFormTypeModal
          open={addFormOpen}
          onClose={() => setAddFormOpen(false)}
          serviceId={addFormService.serviceId}
          existingFormTypeIds={addFormService.existingFormTypeIds}
          existingFormCodes={addFormService.existingFormCodes}
          onSuccess={async () => {
            toast.current?.show({
              severity: 'success',
              summary: 'Added',
              detail: 'Form type mapping created.',
              life: 2500,
            });
            await refetch();
          }}
        />
      )}
    </div>
  );
}
