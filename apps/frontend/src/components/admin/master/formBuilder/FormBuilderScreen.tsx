'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { InputNumber } from 'primereact/inputnumber';

import type { FbPage, FbPageCategory } from '@/types/formBuilder';
import apiClient from '@/lib/api-client';
import { ReusableDataTable } from '@/components/DataTable/ReusableDataTable';
import type { DataTableColumnConfig } from '@/components/DataTable/types';

import {
  useFormBuilderFields,
  useDeleteFormBuilderField,
  useUpdateFormBuilderField,
} from '@/hooks/master/useFormBuilderFields';
import { useFormCategories } from '@/hooks/master/useFormCategories';
import { useFormAddMoreGroups } from '@/hooks/master/useFormAddMore';

import { AddInputModal } from './AddInputModal';
import { FieldOptionsModal } from './FieldOptionsModal';
import { AddMoreModal } from './AddMoreModal';
import { EditInputModal } from './EditInputModal';
import { LogicBuilderModal } from './LogicBuilderModal';
import { OPTION_CAPABLE_TYPES } from './constants';

type Props = { serviceId: string; formTypeId: number };
type ParentCandidate = { id: number; field_code: string; label: string; input_type: string };

const ui = {
  page: {
    display: 'grid',
    gap: 16,
    padding: 12,
  } as const,
  panel: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
    padding: 16,
  } as const,
  hero: {
    border: '1px solid #dbeafe',
    borderRadius: 16,
    background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
    boxShadow: '0 10px 28px rgba(37, 99, 235, 0.06)',
    padding: 16,
  } as const,
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: 600,
  } as const,
  muted: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 1.45,
  } as const,
  btnPrimary: {
    borderRadius: 999,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: '1px solid #1d4ed8',
    boxShadow: '0 8px 18px rgba(37, 99, 235, 0.2)',
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
  iconBoltBtn: {
    borderRadius: 999,
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    border: '1px solid #16a34a',
    color: '#fff',
    boxShadow: '0 6px 14px rgba(34, 197, 94, 0.22)',
    width: 32,
    height: 32,
  } as const,
};

export function FormBuilderScreen({ serviceId, formTypeId }: Props) {
  const toast = useRef<Toast>(null);
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  const [builderMeta, setBuilderMeta] = useState<{
    serviceId: string;
    serviceName: string;
    formTypeId: number;
    formTypeName: string;
  } | null>(null);

  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [pageCategories, setPageCategories] = useState<FbPageCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsFieldId, setOptionsFieldId] = useState<number | null>(null);
  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const [addMoreTriggerId, setAddMoreTriggerId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [logicOpen, setLogicOpen] = useState(false);
  const [logicField, setLogicField] = useState<any | null>(null);
  const [orderDraft, setOrderDraft] = useState<Record<number, number>>({});
  const [savingOrder, setSavingOrder] = useState(false);

  const del = useDeleteFormBuilderField();
  const upd = useUpdateFormBuilderField();
  const { data: categoryMaster = [] } = useFormCategories();

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    if (Array.isArray(categoryMaster)) {
      categoryMaster.forEach((c: any) =>
        map.set(c.id, c.categoryName || c.nameAlt || c.nameInHindi || `Category-${c.id}`),
      );
    }
    return map;
  }, [categoryMaster]);

  const loadPages = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/master/form-builder/services/${encodeURIComponent(serviceId)}/forms/${formTypeId}/pages`,
      );
      setPages(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPages([]);
    }
  }, [serviceId, formTypeId]);

  const loadMeta = useCallback(async () => {
    try {
      const res = await apiClient.get(
        `/master/form-builder/services/${encodeURIComponent(serviceId)}/forms/${formTypeId}/meta`,
      );
      setBuilderMeta(res.data ?? null);
    } catch {
      setBuilderMeta(null);
    }
  }, [serviceId, formTypeId]);

  const loadPageCategories = useCallback(async (pageId: number) => {
    try {
      const res = await apiClient.get(`/master/form-builder/pages/${pageId}/categories`);
      setPageCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPageCategories([]);
    }
  }, []);

  useEffect(() => {
    loadMeta();
    loadPages();
    setSelectedPageId(null);
    setSelectedCategoryId(null);
    setPageCategories([]);
  }, [loadMeta, loadPages]);

  useEffect(() => {
    if (!selectedPageId) {
      setPageCategories([]);
      return;
    }
    setSelectedCategoryId(null);
    loadPageCategories(selectedPageId);
  }, [selectedPageId, loadPageCategories]);

  const { data: builderRows = [], isLoading, refetch } = useFormBuilderFields({
    serviceId,
    formTypeId,
    pageId: selectedPageId,
    categoryId: selectedCategoryId,
    locale,
  });

  const { data: addMoreGroups = [], refetch: refetchAddMoreGroups } = useFormAddMoreGroups(
    selectedPageId && selectedCategoryId
      ? { serviceId, formTypeId, pageId: selectedPageId, categoryId: selectedCategoryId }
      : undefined,
  );

  const fieldsUsedInAddMore = useMemo(() => {
    const usedIds = new Set<number>();
    if (Array.isArray(addMoreGroups)) {
      addMoreGroups.forEach((g: any) => {
        if (Array.isArray(g.columns)) {
          g.columns.forEach((c: any) => usedIds.add(c.builder_field_id));
        }
      });
    }
    return usedIds;
  }, [addMoreGroups]);

  const existingFormFieldIds = useMemo(
    () => (builderRows ?? []).map((r: any) => r.form_field_id).filter(Boolean),
    [builderRows],
  );

  useEffect(() => {
    const next: Record<number, number> = {};
    (builderRows ?? []).forEach((r: any) => {
      next[Number(r.id)] = Number(r.preference ?? 0);
    });
    setOrderDraft((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const key of nextKeys) {
        if (Number(prev[Number(key)]) !== Number(next[Number(key)])) {
          return next;
        }
      }
      return prev;
    });
  }, [builderRows, selectedPageId, selectedCategoryId]);

  const hasOrderChanges = useMemo(() => {
    return (builderRows ?? []).some((r: any) => {
      const id = Number(r.id);
      const existing = Number(r.preference ?? 0);
      const draft = Number(orderDraft[id] ?? existing);
      return existing !== draft;
    });
  }, [builderRows, orderDraft]);

  const saveOrdering = useCallback(async () => {
    if (!Array.isArray(builderRows) || builderRows.length === 0) return;
    const changedRows = builderRows.filter((r: any) => {
      const id = Number(r.id);
      const existing = Number(r.preference ?? 0);
      const draft = Number(orderDraft[id] ?? existing);
      return existing !== draft;
    });

    if (changedRows.length === 0) {
      toast.current?.show({
        severity: 'info',
        summary: 'No Changes',
        detail: 'Field order is already up to date.',
        life: 1800,
      });
      return;
    }

    setSavingOrder(true);
    try {
      await Promise.all(
        changedRows.map((row: any) =>
          upd.mutateAsync({
            id: Number(row.id),
            data: { preference: Number(orderDraft[Number(row.id)] ?? row.preference ?? 0) },
            refetchKey: [
              'fb-builder-fields',
              {
                serviceId,
                formTypeId,
                pageId: selectedPageId,
                categoryId: selectedCategoryId,
              },
            ],
          }),
        ),
      );
      toast.current?.show({
        severity: 'success',
        summary: 'Order Saved',
        detail: `${changedRows.length} field order updated successfully.`,
        life: 2200,
      });
      await refetch();
    } catch {
      toast.current?.show({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Could not update field order.',
      });
    } finally {
      setSavingOrder(false);
    }
  }, [builderRows, formTypeId, orderDraft, refetch, selectedCategoryId, selectedPageId, serviceId, upd]);

  const resetOrderingDraft = useCallback(() => {
    const next: Record<number, number> = {};
    (builderRows ?? []).forEach((r: any) => {
      next[Number(r.id)] = Number(r.preference ?? 0);
    });
    setOrderDraft(next);
  }, [builderRows]);

  const autoResequenceOrdering = useCallback(() => {
    const sorted = [...(builderRows ?? [])].sort((a: any, b: any) => {
      const aPref = Number(a?.preference ?? 0);
      const bPref = Number(b?.preference ?? 0);
      if (aPref !== bPref) return aPref - bPref;
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });
    const next: Record<number, number> = {};
    sorted.forEach((row: any, idx: number) => {
      next[Number(row.id)] = idx + 1;
    });
    setOrderDraft(next);
    toast.current?.show({
      severity: 'info',
      summary: 'Re-sequenced',
      detail: 'Draft order set to 1,2,3... Click Save Order to apply.',
      life: 2000,
    });
  }, [builderRows]);

  const resolveFieldCode = useCallback((row: any): string => {
    return String(
      row?.field_code ??
      row?.fieldCode ??
      row?.formchk_id ??
      row?.formField?.formCheckId ??
      '',
    ).trim();
  }, []);

  const resolveFieldLabel = useCallback((row: any, code: string): string => {
    const label = String(row?.label ?? row?.custom_label ?? row?.formField?.name ?? '').trim();
    return label || code || `Field ${row?.id ?? ''}`.trim();
  }, []);

  const parentCandidates: ParentCandidate[] = useMemo(() => {
    if (!Array.isArray(builderRows) || builderRows.length === 0) return [];
    return builderRows
      .filter((r: any) => r && r.id !== optionsFieldId)
      .map((r: any) => {
        const fieldCode = resolveFieldCode(r);
        return {
          id: r.id,
          field_code: fieldCode,
          label: resolveFieldLabel(r, fieldCode),
          input_type: String(r?.input_type ?? 'text'),
        };
      })
      .filter((r: ParentCandidate) => r.field_code.length > 0);
  }, [builderRows, optionsFieldId, resolveFieldCode, resolveFieldLabel]);

  const logicFieldOptions = useMemo(
    () => {
      const seen = new Set<string>();
      return parentCandidates
        .filter((p) => {
          if (!p.field_code || seen.has(p.field_code)) return false;
          seen.add(p.field_code);
          return true;
        })
        .map((p) => ({
          label: `${p.label} (${p.field_code})`,
          value: p.field_code,
          type: p.input_type,
        }));
    },
    [parentCandidates],
  );

  const editRuleFieldOptions = useMemo(() => {
    if (!Array.isArray(builderRows) || builderRows.length === 0) return [];
    const seen = new Set<string>();
    return builderRows
      .map((r: any) => {
        const code = resolveFieldCode(r);
        if (!code || seen.has(code)) return null;
        seen.add(code);
        return {
          label: `${resolveFieldLabel(r, code)} (${code})`,
          value: code,
        };
      })
      .filter(Boolean) as Array<{ label: string; value: string }>;
  }, [builderRows, resolveFieldCode, resolveFieldLabel]);

  const pageOptions = useMemo(
    () =>
      (pages ?? []).map((p) => ({
        label: `Page ${p.preference} - ${p.page_name ?? 'Untitled'}`,
        value: p.id,
      })),
    [pages],
  );

  const categoryOptions = useMemo(
    () =>
      (pageCategories ?? []).map((c) => ({
        label: categoryNameById.get(c.category_id) ?? `ID: ${c.category_id} (No Name)`,
        value: c.category_id,
      })),
    [pageCategories, categoryNameById],
  );

  const doDelete = useCallback(
    async (id: number) => {
      const ok = window.confirm('Delete this input?');
      if (!ok) return;
      try {
        await del.mutateAsync(id);
        toast.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Input deleted.', life: 2000 });
        await refetch();
      } catch {
        toast.current?.show({ severity: 'error', summary: 'Failed', detail: 'Could not delete.' });
      }
    },
    [del, refetch],
  );

  const columns: DataTableColumnConfig<any>[] = useMemo(
    () => [
      {
        field: 'preference',
        header: 'Order',
        filterType: 'none',
        sortable: true,
        style: { width: '120px' },
        body: (row: any) => {
          const id = Number(row.id);
          const value = Number(orderDraft[id] ?? row.preference ?? 0);
          return (
            <InputNumber
              value={value}
              min={0}
              useGrouping={false}
              onValueChange={(e) => {
                const next = Number(e.value ?? 0);
                setOrderDraft((prev) => ({ ...prev, [id]: next }));
              }}
              inputStyle={{ width: '86px' }}
              className="p-inputtext-sm"
            />
          );
        },
      },
      { field: 'field_code', header: 'Code', filterType: 'text' },
      { field: 'label', header: 'Label', filterType: 'text' },
      {
        field: 'input_type',
        header: 'Type',
        filterType: 'text',
        body: (row: any) => <Tag value={row.input_type} severity="contrast" />,
      },
      {
        field: 'grid_span',
        header: 'Width',
        body: (row: any) => <Tag value={`${row.grid_span ?? 12}/12`} severity="info" />,
      },
      {
        field: 'is_required',
        header: 'Req',
        body: (row: any) =>
          row.is_required === 'Y' ? (
            <Tag value="Required" severity="success" />
          ) : (
            <Tag value="Optional" severity="secondary" />
          ),
      },
      {
        field: 'actions',
        header: 'Actions',
        body: (row: any) => {
          const canOptions = OPTION_CAPABLE_TYPES.includes(row.input_type);
          const isAddMore = row.input_type === 'addmore';
          const isLocked = fieldsUsedInAddMore.has(row.id);

          return (
            <div className="d-flex gap-2">
              <Button
                icon="pi pi-pencil"
                rounded
                text
                severity="info"
                onClick={() => {
                  setEditRow(row);
                  setEditOpen(true);
                }}
                tooltip="Edit Field"
              />
              {canOptions && (
                <Button
                  icon="pi pi-list"
                  rounded
                  text
                  severity="warning"
                  onClick={() => {
                    setOptionsFieldId(row.id);
                    setOptionsOpen(true);
                  }}
                  tooltip="Manage Options"
                />
              )}
              {isAddMore && (
                <Button
                  icon="pi pi-table"
                  rounded
                  text
                  severity="help"
                  onClick={() => {
                    setAddMoreTriggerId(row.id);
                    setAddMoreOpen(true);
                  }}
                  tooltip="Manage Columns"
                />
              )}
              {!isAddMore && (
                <Button
                  icon="pi pi-bolt"
                  rounded
                  severity="success"
                  onClick={() => {
                    setLogicField(row);
                    setLogicOpen(true);
                  }}
                  tooltip="Add Logic Rule"
                  style={ui.iconBoltBtn}
                />
              )}
              {!isLocked && (
                <Button
                  icon="pi pi-trash"
                  rounded
                  text
                  severity="danger"
                  onClick={() => doDelete(row.id)}
                  tooltip="Delete"
                />
              )}
            </div>
          );
        },
      },
    ],
    [doDelete, fieldsUsedInAddMore, orderDraft],
  );

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  return (
    <div style={ui.page}>
      <Toast ref={toast} />

      <section style={ui.hero}>
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
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
              {builderMeta?.serviceName || 'Form Builder'}
            </div>
            <div style={{ color: '#334155', marginTop: 4, fontWeight: 600 }}>{serviceId}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={ui.badge}>
                <i className="pi pi-file" style={{ fontSize: 11 }} />
                Form Type {formTypeId}
              </span>
              <span style={{ ...ui.badge, background: '#fff', borderColor: '#dbe3ef', color: '#334155' }}>
                {builderMeta?.formTypeName || `Form Type ${formTypeId}`}
              </span>
              <span style={{ ...ui.badge, background: '#fff', borderColor: '#dbe3ef', color: '#334155' }}>
                <i className="pi pi-list" style={{ fontSize: 11 }} />
                {builderRows.length} Field{builderRows.length === 1 ? '' : 's'}
              </span>
            </div>
            <div style={{ ...ui.muted, marginTop: 10 }}>
              Select a page and category to manage fields, options, add-more column groups, and logic rules.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              label="Back"
              icon="pi pi-arrow-left"
              onClick={() => router.push(`/${locale}/admin/master/form-builder`)}
              style={ui.btnSecondary}
            />
            <Button
              label="Preview Form"
              icon="pi pi-eye"
              onClick={() =>
                router.push(
                  `/${locale}/admin/master/form-builder/services/${serviceId}/forms/${formTypeId}/builder/preview`,
                )
              }
              style={ui.btnPrimary}
            />
          </div>
        </div>
      </section>

      <section style={ui.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Builder Scope</div>
            <div style={ui.muted}>Choose the page and category where fields should be configured.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={ui.badge}>{pages.length} Page{pages.length === 1 ? '' : 's'}</span>
            <span style={{ ...ui.badge, background: '#fff', borderColor: '#dbe3ef', color: '#334155' }}>
              {pageCategories.length} Categor{pageCategories.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: 6, fontSize: 13 }}>
              Select Page
            </label>
            <Dropdown
              value={selectedPageId}
              options={pageOptions}
              onChange={(e) => setSelectedPageId(e.value)}
              placeholder="Select Page"
              className="w-100"
              filter
              showClear
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', marginBottom: 6, fontSize: 13 }}>
              Select Category
            </label>
            <Dropdown
              value={selectedCategoryId}
              options={categoryOptions}
              onChange={(e) => setSelectedCategoryId(e.value)}
              placeholder={selectedPageId ? 'Select Category' : 'Select page first'}
              className="w-100"
              filter
              showClear
              disabled={!selectedPageId}
            />
          </div>
        </div>

        {(selectedPage || selectedCategoryId) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {selectedPage && (
              <span style={{ ...ui.badge, background: '#fff', borderColor: '#dbe3ef', color: '#334155' }}>
                Active Page: {selectedPage.preference} - {selectedPage.page_name || 'Untitled'}
              </span>
            )}
            {selectedCategoryId && (
              <span style={{ ...ui.badge, background: '#fff', borderColor: '#dbe3ef', color: '#334155' }}>
                Active Category: {categoryNameById.get(selectedCategoryId) ?? selectedCategoryId}
              </span>
            )}
          </div>
        )}

        {!selectedPageId && (
          <div
            style={{
              marginTop: 12,
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              padding: 12,
              color: '#475569',
              fontSize: 13,
              background: '#fff',
            }}
          >
            Start by selecting a page. Category selection and field management will unlock after that.
          </div>
        )}
      </section>

      <section style={ui.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Fields Configuration</div>
            <div style={ui.muted}>
              Set field order directly from listing, then save once. You can still edit from action icons.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={ui.badge}>
              <i className="pi pi-list" style={{ fontSize: 11 }} />
              {builderRows.length} Row{builderRows.length === 1 ? '' : 's'}
            </span>
            <Button
              label="Reset Order"
              icon="pi pi-refresh"
              size="small"
              outlined
              onClick={resetOrderingDraft}
              disabled={!hasOrderChanges || savingOrder}
            />
            <Button
              label="Auto Re-sequence"
              icon="pi pi-sort-numeric-up"
              size="small"
              outlined
              onClick={autoResequenceOrdering}
              disabled={savingOrder || (builderRows?.length ?? 0) === 0}
            />
            <Button
              label="Save Order"
              icon="pi pi-check"
              size="small"
              onClick={saveOrdering}
              disabled={!hasOrderChanges || savingOrder}
              loading={savingOrder}
              style={ui.btnSecondary}
            />
            <Button
              label="Add Field"
              icon="pi pi-plus"
              size="small"
              disabled={!selectedCategoryId}
              onClick={() => setAddOpen(true)}
              style={ui.btnPrimary}
            />
          </div>
        </div>

        <ReusableDataTable
          data={builderRows}
          loading={isLoading}
          config={{
            dataKey: 'id',
            columns,
            rows: 50,
            stripedRows: true,
            showGridlines: false,
          }}
        />
      </section>

      {selectedPageId && selectedCategoryId && (
        <AddInputModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          locale={locale}
          serviceId={serviceId}
          formTypeId={formTypeId}
          pageId={selectedPageId}
          categoryId={selectedCategoryId}
          existingFormFieldIds={existingFormFieldIds}
          onCreated={() => refetch()}
        />
      )}

      <EditInputModal
        open={editOpen}
        row={editRow}
        locale={locale}
        availableRuleFields={editRuleFieldOptions}
        currentRuleFieldCode={resolveFieldCode(editRow)}
        onClose={() => {
          setEditOpen(false);
          setEditRow(null);
        }}
        onSaved={async () => {
          toast.current?.show({ severity: 'success', summary: 'Saved' });
          await refetch();
        }}
      />

      <FieldOptionsModal
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        builderFieldId={optionsFieldId}
        parentCandidates={parentCandidates}
      />

      {selectedPageId && selectedCategoryId && (
        <AddMoreModal
          open={addMoreOpen}
          onClose={() => setAddMoreOpen(false)}
          serviceId={serviceId}
          formTypeId={formTypeId}
          pageId={selectedPageId}
          categoryId={selectedCategoryId}
          triggerBuilderFieldId={addMoreTriggerId}
          onSaved={() => refetchAddMoreGroups()}
        />
      )}

      <LogicBuilderModal
        open={logicOpen}
        onClose={() => {
          setLogicOpen(false);
          setLogicField(null);
        }}
        serviceId={serviceId}
        formId={formTypeId}
        availableFields={logicFieldOptions}
        currentFieldCode={resolveFieldCode(logicField) || undefined}
        currentFieldLabel={resolveFieldLabel(logicField, resolveFieldCode(logicField)) || undefined}
      />
    </div>
  );
}
