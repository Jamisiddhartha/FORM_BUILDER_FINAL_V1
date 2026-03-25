import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="d-flex">
        <AdminSidebar />
        <div className="d-flex flex-column flex-grow-1">
          <DashboardHeader />
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
