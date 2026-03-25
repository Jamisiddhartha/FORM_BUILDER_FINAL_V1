'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import apiClient from '@/lib/api-client';

type SubmissionRow = {
  submissionId: string;
  serviceCode:  string;
  serviceName:  string;
  formId:       number | null;
  status:       string;
  statusLabel:  string;
  submittedOn:  string;
};

// Statuses where applicant can edit & resubmit
const EDITABLE_STATUSES = new Set(['I', 'DP', 'H', 'PD']);

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'P' },
  { label: 'Processing', value: 'F' },
  { label: 'Approved', value: 'A' },
  { label: 'Rejected', value: 'R' },
];

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  A: { label: 'Approved',   bg: '#dcfce7', color: '#15803d' },
  R: { label: 'Rejected',   bg: '#fee2e2', color: '#b91c1c' },
  P: { label: 'Pending',    bg: '#fef9c3', color: '#a16207' },
  F: { label: 'Processing', bg: '#dbeafe', color: '#1d4ed8' },
};

export default function TrackApplicationsPage() {
  const router = useRouter();
  const params = useParams();

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    apiClient
      .get('/investor/services/submissions')
      .then((res) => setSubmissions(Array.isArray(res.data) ? res.data : (res.data?.data ?? [])))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredData = submissions.filter((row) => {
    const matchesStatus = !statusFilter || row.status === statusFilter;
    const q = globalFilter.toLowerCase();
    const matchesSearch =
      !q ||
      row.submissionId?.toLowerCase().includes(q) ||
      row.serviceCode?.toLowerCase().includes(q) ||
      row.serviceName?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const statusBodyTemplate = (rowData: SubmissionRow) => {
    const cfg       = STATUS_MAP[rowData.status] ?? { bg: '#f3f4f6', color: '#374151' };
    const label     = rowData.statusLabel || rowData.status || 'Unknown';
    const isEditable = EDITABLE_STATUSES.has(rowData.status);

    const badge = (
      <span style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        cursor: isEditable ? 'pointer' : 'default',
        textDecoration: isEditable ? 'underline dotted' : 'none',
      }}>
        {label}
        {isEditable && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>✏️</span>}
      </span>
    );

    if (isEditable) {
      const editUrl = rowData.formId
        ? `/${params?.locale ?? 'en'}/investor/services/${rowData.serviceCode}/apply/${rowData.formId}?submissionId=${rowData.submissionId}&mode=edit`
        : `/${params?.locale ?? 'en'}/investor/applications/${rowData.submissionId}?edit=true`;
      return (
        <span onClick={() => router.push(editUrl)} title="Click to edit & resubmit">
          {badge}
        </span>
      );
    }
    return badge;
  };

  const dateBodyTemplate = (rowData: SubmissionRow) => {
    if (!rowData.submittedOn) return <span style={{ color: '#9ca3af' }}>—</span>;
    return new Date(rowData.submittedOn).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const actionBodyTemplate = (rowData: SubmissionRow) => (
    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
      <Button
        icon="pi pi-eye"
        rounded
        text
        severity="info"
        tooltip="View Application"
        tooltipOptions={{ position: 'top' }}
        onClick={() =>
          router.push(`/${params?.locale ?? 'en'}/investor/applications/${rowData.submissionId}`)
        }
      />
      {rowData.status === 'A' && (
        <Button
          icon="pi pi-download"
          rounded
          text
          severity="success"
          tooltip="Download Certificate"
          tooltipOptions={{ position: 'top' }}
        />
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
          My Applications
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
          Track the status of your submitted departmental service applications.
        </p>
      </div>

      {/* Card wrapper */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
        }}>
          <IconField iconPosition="left" style={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <InputIcon className="pi pi-search" />
            <InputText
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search App ID, Service..."
              style={{ width: '100%' }}
            />
          </IconField>

          <Dropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatusFilter(e.value)}
            placeholder="Filter by Status"
            style={{ minWidth: '160px' }}
          />

          {(globalFilter || statusFilter) && (
            <Button
              label="Clear"
              icon="pi pi-times"
              outlined
              severity="secondary"
              size="small"
              onClick={() => { setGlobalFilter(''); setStatusFilter(''); }}
            />
          )}

          <span style={{
            marginLeft: 'auto',
            fontSize: '0.82rem',
            color: '#6b7280',
            background: '#e5e7eb',
            borderRadius: '999px',
            padding: '3px 10px',
            fontWeight: 500,
          }}>
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '16px' }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="2.2rem" className="mb-2" />
            ))}
          </div>
        ) : (
          <DataTable
            value={filteredData}
            emptyMessage="No applications found."
            stripedRows
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sortMode="multiple"
            removableSort
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first}–{last} of {totalRecords}"
            pt={{
              thead: { style: { background: '#f3f4f6' } },
              headerCell: { style: { background: '#f3f4f6', color: '#374151', fontWeight: 600, fontSize: '0.85rem', borderBottom: '1px solid #e5e7eb' } },
              bodyRow: { style: { borderBottom: '1px solid #f3f4f6' } },
              bodyCell: { style: { fontSize: '0.875rem', color: '#374151', padding: '10px 12px' } },
            }}
          >
            <Column field="submissionId" header="App ID" sortable style={{ width: '100px', fontWeight: 600 }} />
            <Column field="serviceCode" header="Service Code" sortable style={{ width: '130px' }} />
            <Column field="serviceName" header="Service Name" sortable />
            <Column field="submittedOn" header="Submitted On" body={dateBodyTemplate} sortable style={{ width: '145px' }} />
            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ width: '125px' }} />
            <Column header="Actions" body={actionBodyTemplate} style={{ width: '100px' }} />
          </DataTable>
        )}
      </div>
    </div>
  );
}
