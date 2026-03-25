"use client";

import { useAuth } from '@/hooks/useAuth';
import { useFbCounts } from '@/hooks/department/fb/useFbInbox';
import { getRoleConfig } from './roleConfig';
import { MiddleSection } from './MiddleSection';

function StatCard({ label, value, accent, onClick }: {
  label: string; value: number | string; accent: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderTop: `4px solid ${accent}`,
        borderRadius: 10,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        minWidth: 140,
        flex: '1 1 140px',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
    >
      <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function FormBuilderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const roleId = Number(user?.roleId || 0);
  const config = getRoleConfig(roleId);

  const { data: countsData, isLoading: countsLoading } = useFbCounts(!authLoading && roleId > 0);
  const byTab: Record<string, number> = countsData?.byTab ?? {};
  const total = countsData?.total ?? 0;

  const pending   = byTab['pending']   ?? 0;
  const forwarded = byTab['forwarded'] ?? 0;
  const approved  = byTab['approved']  ?? 0;
  const rejected  = byTab['rejected']  ?? 0;
  const reverted  = byTab['reverted']  ?? 0;

  if (authLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading dashboard…
      </div>
    );
  }

  if (!roleId) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '14px 18px', color: '#92400e' }}>
          Dashboard is not configured for this role.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>
          Officer Dashboard
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          {config.roleLabel} — manage your pending service applications.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: '1.5rem' }}>
        <StatCard label="Pending"   value={countsLoading ? '…' : pending}   accent="#f59e0b" />
        <StatCard label="Forwarded" value={countsLoading ? '…' : forwarded} accent="#2563eb" />
        <StatCard label="Approved"  value={countsLoading ? '…' : approved}  accent="#10b981" />
        <StatCard label="Rejected"  value={countsLoading ? '…' : rejected}  accent="#ef4444" />
        <StatCard label="Reverted"  value={countsLoading ? '…' : reverted}  accent="#f97316" />
      </div>

      {/* Table */}
      <MiddleSection
        tabs={config.tabs}
        visibleColumns={config.tableColumns}
        enabled={!authLoading && roleId > 0}
      />

    </div>
  );
}
