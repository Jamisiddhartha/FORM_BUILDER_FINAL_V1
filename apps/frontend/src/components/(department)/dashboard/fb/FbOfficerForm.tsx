'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import type { OfficerFormData } from '@/hooks/department/fb/useFbInbox';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#374151',
  marginBottom: 4,
  display: 'block',
};

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: '0.82rem',
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};

const INPUT_READONLY: React.CSSProperties = {
  ...INPUT_BASE,
  background: '#f9fafb',
  color: '#6b7280',
  cursor: 'not-allowed',
};

// Map button label → action code
function getActionCode(label: string): string {
  const l = label.toLowerCase().trim();
  if (l.includes('revert')) return 'RBI';
  if (l.includes('forward')) return 'F';
  if (l.includes('approv')) return 'A';
  if (l.includes('reject')) return 'R';
  return l.toUpperCase();
}

const BTN_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  approve:               { bg: '#16a34a', color: '#fff', border: '#15803d' },
  approved:              { bg: '#16a34a', color: '#fff', border: '#15803d' },
  reject:                { bg: '#dc2626', color: '#fff', border: '#b91c1c' },
  rejected:              { bg: '#dc2626', color: '#fff', border: '#b91c1c' },
  forward:               { bg: '#2563eb', color: '#fff', border: '#1d4ed8' },
  revert:                { bg: '#f59e0b', color: '#fff', border: '#d97706' },
  'revert to applicant': { bg: '#f59e0b', color: '#fff', border: '#d97706' },
};

function btnStyle(label: string, disabled: boolean): React.CSSProperties {
  const key   = label.toLowerCase().trim();
  const match = Object.entries(BTN_COLOR).find(([k]) => key.includes(k));
  const c     = match?.[1] ?? { bg: '#4b5563', color: '#fff', border: '#374151' };
  return {
    background:   disabled ? '#e5e7eb' : c.bg,
    color:        disabled ? '#9ca3af' : c.color,
    border:       `1px solid ${disabled ? '#d1d5db' : c.border}`,
    borderRadius: 7,
    padding:      '9px 20px',
    fontWeight:   600,
    fontSize:     '0.875rem',
    cursor:       disabled ? 'not-allowed' : 'pointer',
    whiteSpace:   'nowrap',
    opacity:      disabled ? 0.7 : 1,
  };
}

function FieldInput({ fieldCode, inputType, isRequired, isReadonly, placeholder }: {
  fieldCode:   string;
  inputType:   string;
  isRequired:  boolean;
  isReadonly:  boolean;
  placeholder: string | null;
}) {
  const style = isReadonly ? INPUT_READONLY : INPUT_BASE;
  const ph    = placeholder || '';

  if (inputType === 'textarea') {
    return (
      <textarea
        name={fieldCode}
        required={isRequired}
        readOnly={isReadonly}
        placeholder={ph}
        rows={3}
        style={{ ...style, resize: 'vertical' }}
      />
    );
  }

  if (inputType === 'select' || inputType === 'dropdown') {
    return (
      <select name={fieldCode} required={isRequired} disabled={isReadonly} style={style}>
        <option value="">— Select —</option>
      </select>
    );
  }

  if (inputType === 'checkbox') {
    return (
      <input
        type="checkbox"
        name={fieldCode}
        disabled={isReadonly}
        style={{ width: 16, height: 16, cursor: isReadonly ? 'not-allowed' : 'pointer' }}
      />
    );
  }

  const type =
    inputType === 'date'   ? 'date'   :
    inputType === 'number' ? 'number' :
    inputType === 'email'  ? 'email'  :
    inputType === 'file'   ? 'file'   : 'text';

  return (
    <input
      type={type}
      name={fieldCode}
      required={isRequired}
      readOnly={isReadonly}
      placeholder={ph}
      style={style}
    />
  );
}

function CategorySection({
  cat,
  onAction,
  submitting,
  doneAction,
}: {
  cat:        OfficerFormData['categories'][number];
  onAction:   (label: string) => void;
  submitting: string;
  doneAction: string | null;
}) {
  const inputFields   = cat.fields.filter((f) => f.inputType !== 'button');
  const actionButtons = cat.fields.filter((f) => f.inputType === 'button');

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{
        fontWeight: 700, fontSize: '0.85rem', color: '#1e40af',
        background: '#eff6ff', padding: '7px 14px',
        borderRadius: '6px 6px 0 0', borderBottom: '2px solid #bfdbfe',
      }}>
        {cat.categoryName}
      </div>

      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderTop: 'none',
        borderRadius: actionButtons.length ? '0' : '0 0 6px 6px',
        padding: inputFields.length ? '14px' : '0',
      }}>
        {inputFields.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px 24px' }}>
            {inputFields.map((f) => (
              <div key={f.fieldCode} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={LABEL_STYLE}>
                  {f.label}
                  {f.isRequired && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                </label>
                {f.helpText && (
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 4 }}>{f.helpText}</span>
                )}
                <FieldInput
                  fieldCode={f.fieldCode}
                  inputType={f.inputType}
                  isRequired={f.isRequired}
                  isReadonly={f.isReadonly}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons row */}
      {actionButtons.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
          padding: '12px 14px', background: '#f8fafc',
          border: '1px solid #e5e7eb',
          borderTop: inputFields.length ? '1px solid #e5e7eb' : 'none',
          borderRadius: '0 0 6px 6px',
        }}>
          {actionButtons.map((f) => (
            <button
              key={f.fieldCode}
              type="button"
              disabled={!!submitting || !!doneAction}
              onClick={() => onAction(f.label)}
              style={btnStyle(f.label, !!submitting || !!doneAction)}
            >
              {submitting === getActionCode(f.label) ? '…' : f.label}
            </button>
          ))}

          {doneAction && (
            <span style={{
              marginLeft: 8, fontSize: '0.82rem', fontWeight: 600,
              color: '#15803d', background: '#dcfce7',
              border: '1px solid #86efac', borderRadius: 6,
              padding: '6px 14px',
            }}>
              ✓ Action submitted successfully
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function FbOfficerForm({
  data,
  loading,
  submissionId,
}: {
  data:         OfficerFormData | undefined;
  loading:      boolean;
  submissionId: number;
}) {
  const router                      = useRouter();
  const formRef                     = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [doneAction, setDoneAction] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const handleAction = async (label: string) => {
    const action = getActionCode(label);
    if (!action) return;

    // Extract comment + file from the form
    let comment            = '';
    let supportiveDocument = '';

    if (formRef.current) {
      const fd = new FormData(formRef.current);
      for (const [key, val] of fd.entries()) {
        if (typeof val === 'string' && val.trim()) {
          if (key.toLowerCase().includes('comment') || key.toLowerCase().includes('remark')) {
            comment = val.trim();
          } else if (!comment) {
            comment = val.trim();
          }
        }
      }
    }

    if (!comment) {
      setError('Comment is required before taking action.');
      return;
    }

    setSubmitting(action);
    setError(null);
    try {
      // If a file is selected, upload it first
      const fileInput = formRef.current?.querySelector('input[type="file"]') as HTMLInputElement | null;
      const file      = fileInput?.files?.[0];
      if (file) {
        const uploadFd = new FormData();
        uploadFd.append('submissionId', String(submissionId));
        uploadFd.append('file', file);
        const uploadRes = await apiClient.post('/fb-dashboard/upload-supportive-doc', uploadFd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        supportiveDocument = uploadRes.data?.filename || '';
      }

      await apiClient.post('/fb-dashboard/submit-action', {
        submissionId,
        action,
        comment,
        supportiveDocument: supportiveDocument || undefined,
      });
      setDoneAction(action);
      setTimeout(() => router.back(), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return <div style={{ color: '#9ca3af', padding: '1rem' }}>Loading officer form…</div>;
  }

  if (!data || !data.categories.length) {
    return (
      <div style={{ color: '#9ca3af', padding: '1rem', fontSize: '0.875rem' }}>
        No officer form configured for your role on this service.
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
      {error && (
        <div style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 7,
          background: '#fee2e2', color: '#b91c1c',
          border: '1px solid #fca5a5', fontSize: '0.85rem', fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {data.categories.map((cat) => (
        <CategorySection
          key={cat.categoryCode}
          cat={cat}
          onAction={handleAction}
          submitting={submitting ?? ''}
          doneAction={doneAction}
        />
      ))}
    </form>
  );
}
