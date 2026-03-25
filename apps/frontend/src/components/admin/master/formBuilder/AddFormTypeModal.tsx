'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';

import apiClient from '@/lib/api-client';
import { useFormTypes } from '@/hooks/master/useFormTypes';
import { STATE_PREFIX } from '@/constants/formCode';

const ui = {
  shell: {
    display: 'grid',
    gap: 14,
  } as const,
  hero: {
    border: '1px solid #dbeafe',
    background: 'linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%)',
    borderRadius: 14,
    padding: 14,
  } as const,
  section: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#ffffff',
    padding: 14,
  } as const,
  label: {
    display: 'block',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 6,
    fontSize: 13,
  } as const,
  helper: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.4,
    marginTop: 6,
  } as const,
  row2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  } as const,
  codeBox: {
    border: '1px solid #dbe3ef',
    borderRadius: 10,
    background: '#f8fafc',
    padding: 10,
  } as const,
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 12,
    marginTop: 4,
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
    background: '#fff',
    border: '1px solid #cbd5e1',
    color: '#0f172a',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
    fontWeight: 600,
  } as const,
  stat: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid #bfdbfe',
    background: '#ffffff',
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: 600,
  } as const,
};

type Props = {
  open: boolean;
  onClose: () => void;
  serviceId: string;

  // allow async handler from parent (you pass async in FormBuilderMaster)
  onSuccess: () => void | Promise<void>;

  // Validation: prevent duplicate form type in same service
  existingFormTypeIds?: number[];

  // Validation: prevent duplicate generated form codes in same service
  existingFormCodes?: string[];
};

export function AddFormTypeModal({
  open,
  onClose,
  serviceId,
  onSuccess,
  existingFormTypeIds = [],
  existingFormCodes = [],
}: Props) {
  const toast = useRef<Toast>(null);

  const { data: formTypes } = useFormTypes();

  const [formTypeId, setFormTypeId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState(''); // read-only value from server
  const [formVersion, setFormVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);

  const options = useMemo(() => {
    return (formTypes ?? []).map((t: any) => ({
      label: `${t.name} (${t.id})`,
      value: t.id,
    }));
  }, [formTypes]);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setFormTypeId(null);
    setFormName('');
    setFormVersion('');
    setFormCode('');
    setLoadingCode(false);
  }, [open]);

  // Fetch preview code when formTypeId changes
  useEffect(() => {
    if (!open) return;

    if (!formTypeId) {
      setFormCode('');
      return;
    }

    // Prevent duplicate form type early
    if (existingFormTypeIds.includes(formTypeId)) {
      setFormTypeId(null);
      setFormCode('');
      toast.current?.show({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'This Form Type is already mapped to this Service.',
        life: 3000,
      });
      return;
    }

    const fetchCode = async () => {
      setLoadingCode(true);
      try {
        const res = await apiClient.get(
          `/master/form-builder/services/${encodeURIComponent(serviceId)}/forms/preview-code`,
          { params: { formTypeId } }
        );

        const nextCode = res?.data?.formCode ?? '';

        // Prevent duplicate form code (if backend returns something already used)
        if (nextCode && existingFormCodes.includes(nextCode)) {
          setFormCode('');
          toast.current?.show({
            severity: 'warn',
            summary: 'Duplicate Code',
            detail: 'Generated Form Code already exists for this Service.',
            life: 3500,
          });
          return;
        }

        setFormCode(nextCode);
      } catch (e: any) {
        setFormCode('');
        toast.current?.show({
          severity: 'error',
          summary: 'Failed',
          detail: e?.response?.data?.message ?? 'Could not generate Form Code.',
          life: 3500,
        });
      } finally {
        setLoadingCode(false);
      }
    };

    fetchCode();
  }, [open, formTypeId, serviceId, existingFormTypeIds, existingFormCodes]);

  async function save() {
    if (!formTypeId || !formName.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Missing fields',
        detail: 'Please fill Form Type and Form Name.',
        life: 3000,
      });
      return;
    }

    if (existingFormTypeIds.includes(formTypeId)) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Duplicate',
        detail: 'This Form Type is already mapped to this Service.',
        life: 3000,
      });
      return;
    }

    if (!formCode.trim()) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Form Code not ready',
        detail: 'Form Code could not be generated. Please try again.',
        life: 3000,
      });
      return;
    }

    // Extra safety: prevent duplicates by code too
    if (existingFormCodes.includes(formCode.trim())) {
      toast.current?.show({
        severity: 'warn',
        summary: 'Duplicate Code',
        detail: 'This Form Code already exists for this Service.',
        life: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(
        `/master/form-builder/services/${encodeURIComponent(serviceId)}/forms`,
        {
          formTypeId,
          formName,
          formCode,
          formVersion: formVersion?.trim() ? formVersion.trim() : undefined,
        }
      );

      toast.current?.show({
        severity: 'success',
        summary: 'Saved',
        detail: 'Form type added successfully.',
        life: 2500,
      });

      // supports both sync and async onSuccess
      await Promise.resolve(onSuccess());

      onClose();
    } catch (e: any) {
      toast.current?.show({
        severity: 'error',
        summary: 'Failed',
        detail: e?.response?.data?.message ?? 'Could not add form type.',
        life: 3500,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="pi pi-plus-circle" style={{ color: '#2563eb' }} />
          <span style={{ fontWeight: 700 }}>Add Form Type</span>
        </div>
      }
      visible={open}
      onHide={onClose}
      style={{ width: 'min(720px, 95vw)' }}
      modal
      draggable={false}
      closable={!saving}
    >
      <Toast ref={toast} />

      <div style={ui.shell}>
        <div style={ui.hero}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Create a new form mapping for this service
          </div>
          <div style={{ color: '#475569', fontSize: 13, marginBottom: 10 }}>
            Pick a form type, give it a clear name, then save. The form code is generated automatically.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={ui.stat}>
              <i className="pi pi-briefcase" style={{ fontSize: 11 }} />
              Service: {serviceId}
            </span>
            <span style={ui.stat}>
              <i className="pi pi-list" style={{ fontSize: 11 }} />
              {existingFormTypeIds.length} Existing Type{existingFormTypeIds.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div style={ui.section}>
          <div style={ui.row2}>
            <div style={{ minWidth: 0 }}>
              <label style={ui.label}>Form Type</label>
              <Dropdown
                value={formTypeId}
                options={options}
                onChange={(e) => setFormTypeId(e.value)}
                placeholder="Select Form Type"
                className="w-100"
                filter
                showClear
                disabled={saving}
              />
              <div style={ui.helper}>
                Duplicate form types for the same service are automatically blocked.
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={ui.label}>Form Version (optional)</label>
              <InputText
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                className="w-100"
                placeholder="e.g. V1.0"
                disabled={saving}
              />
              <div style={ui.helper}>Use a simple label to track updates later.</div>
            </div>
          </div>
        </div>

        <div style={ui.section}>
          <div style={{ marginBottom: 12 }}>
            <label style={ui.label}>Form Name</label>
            <InputText
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-100"
              placeholder="Enter a user-friendly form name"
              disabled={saving}
            />
            <div style={ui.helper}>Example: New License Application Form</div>
          </div>

          <div>
            <label style={ui.label}>Form Code</label>
            <div style={ui.codeBox}>
              <InputText
                value={loadingCode ? 'Generating form code...' : formCode}
                className="w-100"
                readOnly
                disabled
              />
              <div style={ui.helper}>
                Auto-generated pattern: {STATE_PREFIX}-SR-{serviceId}-FRM-&lt;PK&gt;_&lt;FormTypeId(2-digit)&gt;
              </div>
            </div>
          </div>
        </div>

        <div style={ui.footer}>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            {loadingCode ? 'Preparing form code...' : 'Ready to create the form mapping.'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={onClose}
              disabled={saving}
              style={ui.btnSecondary}
            />
            <Button
              label="Save Form Type"
              icon="pi pi-check"
              onClick={save}
              loading={saving}
              disabled={saving || loadingCode || !formTypeId}
              style={ui.btnPrimary}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
