'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

// ─── helpers ─────────────────────────────────────────────────────────────────
function renderVal(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function buildSections(data: any) {
  if (!data) return [];
  const formData = (data.formData ?? {}) as Record<string, unknown>;
  const flatData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(formData)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) flatData[nk] = nv;
    } else {
      flatData[k] = v;
    }
  }
  const categoryOrder: string[] = [];
  const categoryNames: Record<string, string> = {};
  for (const f of data.fieldSchema ?? []) {
    const cat = f.categoryCode ?? f.categoryName;
    if (!categoryOrder.includes(cat)) { categoryOrder.push(cat); categoryNames[cat] = f.categoryName; }
  }
  const grouped: Record<string, Array<{ label: string; value: unknown }>> = {};
  for (const f of data.fieldSchema ?? []) {
    const cat = f.categoryCode ?? f.categoryName;
    if (!grouped[cat]) grouped[cat] = [];
    const val = flatData[f.fieldCode] ?? flatData[f.fieldCode.toLowerCase()];
    if (val !== undefined && val !== null && val !== '') grouped[cat].push({ label: f.label, value: val });
  }
  return categoryOrder.filter((c) => grouped[c]?.length).map((c) => ({ key: c, title: categoryNames[c], fields: grouped[c] }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FbApplicationPrintPage() {
  const params       = useParams();
  const submissionId = Number((params as any)?.submissionId);

  const { data, isLoading } = useQuery({
    queryKey: ['fb-print-data', submissionId],
    enabled: submissionId > 0,
    queryFn: async () => {
      const res = await apiClient.get(`/fb-dashboard/print-data?submissionId=${submissionId}`);
      return res.data;
    },
  });

  const sections = buildSections(data);
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const statusColor =
    ['A','APPROVED'].includes(String(data?.status || '').toUpperCase()) ? '#16a34a' :
    ['R','REJECTED','REJECT'].includes(String(data?.status || '').toUpperCase()) ? '#dc2626' : '#a16207';

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          .print-overlay { position: static !important; overflow: visible !important; background: #fff !important; }
          .page { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
        }
      `}</style>

      {/* Full-screen overlay covers the department sidebar */}
      <div className="print-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#e8eaf0', overflowY: 'auto',
      }}>
        {/* Toolbar */}
        <div className="no-print" style={{
          background: '#1e3a5f', padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
        }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#fff', color: '#1e3a5f', border: 'none', borderRadius: 6, padding: '7px 22px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            🖨️ Print / Save as PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ✕ Close
          </button>
        </div>

        {/* A4 Page */}
        {isLoading || !data ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#666', fontSize: '1rem' }}>Loading…</div>
        ) : (
          <div className="page" style={{
            background: '#fff', width: 794, margin: '20px auto 40px',
            padding: '20mm 16mm', fontFamily: 'Arial, sans-serif',
            fontSize: '10pt', color: '#000',
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          }}>
            {/* Title */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: 8, marginBottom: 10 }}>
              <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {data.serviceName}
              </div>
              <div style={{ fontSize: '10pt', fontWeight: 600, marginTop: 2 }}>APPLICATION FORM</div>
            </div>

            {/* Meta row */}
            <table style={{ width: '100%', marginBottom: 10, fontSize: '9.5pt' }}>
              <tbody>
                <tr>
                  <td><b>Unit Name</b> : {data.unitName || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <b>Status for App ID</b> : #{submissionId} is{' '}
                    <span style={{ color: statusColor, fontWeight: 700 }}>{data.statusLabel}</span>{' '}
                    As On {now}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Sections */}
            {sections.map((sec: any, si: number) => (
              <div key={sec.key} style={{ marginBottom: 10 }}>
                {/* Blue header */}
                <div style={{
                  background: '#1e3a5f', color: '#fff',
                  fontWeight: 700, fontSize: '9.5pt', padding: '4px 10px',
                }}>
                  {sec.title}
                </div>

                <div style={{ position: 'relative' }}>
                  {/* Applicant photo — first section top-right */}
                  {si === 0 && data.photoUrl && (
                    <div style={{
                      position: 'absolute', top: 4, right: 0,
                      border: '1px solid #ccc', background: '#f9f9f9',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.photoUrl} alt="Applicant" style={{ width: 70, height: 85, objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}

                  <table style={{ width: si === 0 && data.photoUrl ? 'calc(100% - 82px)' : '100%', borderCollapse: 'collapse', border: '1px solid #ccc', fontSize: '9pt' }}>
                    <tbody>
                      {chunk(sec.fields, 2).map((pair: any[], ri: number) => (
                        <tr key={ri} style={{ borderBottom: '1px solid #ddd' }}>
                          {pair.map((f: any, ci: number) => (
                            <td key={ci} style={{ width: '50%', padding: '3px 8px', borderRight: ci === 0 ? '1px solid #ddd' : 'none', verticalAlign: 'top' }}>
                              <b>{f.label}</b>
                              <span style={{ color: '#444', marginLeft: 4 }}>: {renderVal(f.value)}</span>
                            </td>
                          ))}
                          {pair.length === 1 && <td style={{ width: '50%' }} />}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Footer */}
            <div style={{ marginTop: 14, borderTop: '1px solid #ccc', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#666' }}>
              <span>Application ID: #{submissionId}</span>
              <span>This is a system-generated document.</span>
              <span>Generated on: {now}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
