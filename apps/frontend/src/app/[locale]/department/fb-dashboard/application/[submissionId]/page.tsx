'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFbApplicationView, useFbTimeline, useOfficerForm, useDocumentVerification } from '@/hooks/department/fb/useFbInbox';
import FbTimelineSection from '@/components/(department)/dashboard/fb/FbTimelineSection';
import FbOfficerForm from '@/components/(department)/dashboard/fb/FbOfficerForm';
import FbDocumentVerification from '@/components/(department)/dashboard/fb/FbDocumentVerification';

function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{title}</span>
        <span style={{ fontSize: '1.1rem', color: '#6b7280', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid #f3f4f6' }}>
          {children}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  P:        { bg: '#fef9c3', color: '#a16207' },
  PENDING:  { bg: '#fef9c3', color: '#a16207' },
  A:        { bg: '#dcfce7', color: '#15803d' },
  APPROVED: { bg: '#dcfce7', color: '#15803d' },
  R:        { bg: '#fee2e2', color: '#b91c1c' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c' },
  F:        { bg: '#dbeafe', color: '#1d4ed8' },
  FORWARDED:{ bg: '#dbeafe', color: '#1d4ed8' },
  FA:       { bg: '#e0e7ff', color: '#4338ca' },
  RBI:      { bg: '#fff7ed', color: '#c2410c' },
};

function renderValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default function FbApplicationViewPage() {
  const params       = useParams();
  const router       = useRouter();
  const submissionId = Number((params as any)?.submissionId);

  const { data: appView, isLoading } = useFbApplicationView(submissionId > 0 ? submissionId : undefined);
  const { data: timeline = [], isLoading: loadingTimeline } = useFbTimeline(submissionId > 0 ? submissionId : undefined);
  const { data: officerForm, isLoading: loadingOfficerForm } = useOfficerForm(submissionId > 0 ? submissionId : undefined);
  const { data: docVerification, isLoading: loadingDocVerification } = useDocumentVerification(submissionId > 0 ? submissionId : undefined);

  if (!submissionId || submissionId <= 0) {
    return <main style={{ padding: '2rem' }}><div style={{ color: '#b91c1c' }}>Invalid submission ID.</div></main>;
  }

  const statusCode = String(appView?.status || 'P').toUpperCase();
  const sStyle = STATUS_STYLE[statusCode] ?? { bg: '#f3f4f6', color: '#374151' };

  // Build label map from fieldSchema: fieldCode → { label, categoryName }
  const labelMap = new Map<string, { label: string; categoryName: string }>();
  for (const f of appView?.fieldSchema ?? []) {
    labelMap.set(f.fieldCode, { label: f.label, categoryName: f.categoryName });
  }

  // Build category order from fieldSchema
  const categoryOrder: string[] = [];
  const categoryNames: Record<string, string> = {};
  for (const f of appView?.fieldSchema ?? []) {
    const cat = f.categoryCode ?? f.categoryName;
    if (!categoryOrder.includes(cat)) {
      categoryOrder.push(cat);
      categoryNames[cat] = f.categoryName;
    }
  }

  // Group field values by category using fieldSchema
  // formData can be flat { fieldCode: value } or nested { sectionKey: { fieldCode: value } }
  const formData = (appView?.formData ?? {}) as Record<string, unknown>;

  // Flatten formData: handle both flat and one-level-nested structures
  // Only store keys once — no prefixed duplicates
  const flatData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(formData)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
        flatData[nk] = nv;
      }
    } else {
      flatData[k] = v;
    }
  }

  // Group by category using schema only — no "Other" fallback
  const grouped: Record<string, Array<{ label: string; value: unknown }>> = {};

  for (const f of appView?.fieldSchema ?? []) {
    const cat = f.categoryCode ?? f.categoryName;
    if (!grouped[cat]) grouped[cat] = [];
    const val = flatData[f.fieldCode] ?? flatData[f.fieldCode.toLowerCase()];
    if (val !== undefined && val !== null && val !== '') {
      grouped[cat].push({ label: f.label, value: val });
    }
  }

  // Final sections to render — only schema-matched categories
  const sections = categoryOrder
    .filter((c) => grouped[c]?.length)
    .map((c) => ({ key: c, title: categoryNames[c], fields: grouped[c] }));

  // If schema is empty (no form builder fields), fall back to raw display
  const hasSchema = (appView?.fieldSchema?.length ?? 0) > 0;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          .print-container { padding: 0 !important; }
        }
      `}</style>

      <main className="print-container" style={{ padding: '1.5rem', background: '#f4f6fb', minHeight: '100vh' }}>

        {/* Header */}
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '1.25rem' }}>
          <div>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: 6 }}>
              ← Back
            </button>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Application #{submissionId}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>            
            <button
              onClick={() => window.open(`/en/department/fb-dashboard/application/${submissionId}/print`, '_blank')}
              style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 20px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              🖨️ Print / PDF
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ background: '#fff', borderRadius: 10, padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
        ) : (
          <>
            {/* Meta card */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px 24px' }}>
                <MetaField label="Application ID"  value={`#${submissionId}`} />
                <MetaField label="Service"         value={appView?.serviceName || appView?.serviceId || '—'} />
                <MetaField label="Unit / Company"  value={appView?.unitName || '—'} />
                <MetaField label="Submitted On"    value={appView?.createdDate ? new Date(appView.createdDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <MetaField label="Last Updated"    value={appView?.updatedDate ? new Date(appView.updatedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Status</div>
                  <span style={{ background: sStyle.bg, color: sStyle.color, borderRadius: 999, padding: '3px 12px', fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${sStyle.color}33` }}>
                    {appView?.statusLabel || statusCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Data by Category */}
            <Accordion title="📄 Application Details" defaultOpen={false}>
              {sections.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '0.875rem', paddingTop: '1rem' }}>No form data available.</div>
              ) : (
                sections.map((section) => (
                  <div key={section.key} style={{ marginBottom: '1.25rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', background: '#eff6ff', padding: '7px 14px', borderRadius: '6px 6px 0 0', borderBottom: '2px solid #bfdbfe' }}>
                      {section.title}
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px 24px' }}>
                        {section.fields.map((f, i) => (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                            <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 700 }}>{f.label}</span>
                            <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>{renderValue(f.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {!hasSchema && Object.keys(formData).length > 0 && (
                <RawFormData formData={formData} />
              )}
            </Accordion>

            {/* Timeline */}
            <Accordion title="📋 Transaction History / Timeline" defaultOpen={false}>
              <div style={{ paddingTop: '1rem' }} id="history">
                <FbTimelineSection timeline={timeline} loading={loadingTimeline} />
              </div>
            </Accordion>

            {/* Document Verification — only renders if role has DOCUMENT_VERIFICATION subform */}
            {(loadingDocVerification || (docVerification?.documents?.length ?? 0) > 0) && (
              <Accordion title="📎 Document Checklist" defaultOpen={true}>
                <div style={{ paddingTop: '1rem' }}>
                  <FbDocumentVerification
                    data={docVerification}
                    loading={loadingDocVerification}
                    submissionId={submissionId}
                  />
                </div>
              </Accordion>
            )}

            {/* Officer Form */}
            <Accordion title="📝 Department Action" defaultOpen={true}>
              <div style={{ paddingTop: '1rem' }}>
                <FbOfficerForm data={officerForm} loading={loadingOfficerForm} submissionId={submissionId} />
              </div>
            </Accordion>
          </>
        )}
      </main>
    </>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// Fallback renderer when no form schema available
function RawFormData({ formData }: { formData: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(formData).map(([key, val]) => {
        const title = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const entries = Object.entries(val as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined && v !== '');
          if (!entries.length) return null;
          return (
            <div key={key} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af', background: '#eff6ff', padding: '7px 14px', borderRadius: '6px 6px 0 0', borderBottom: '2px solid #bfdbfe' }}>
                {title}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px 24px' }}>
                  {entries.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 700 }}>
                        {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 400 }}>
                        {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '—')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
}
