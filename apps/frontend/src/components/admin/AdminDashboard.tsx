'use client';

import { useUsers, useRoles, usePermissions } from '@/hooks/useAdminData';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Role {
  id: number;
  name: string;
  _count?: {
    users: number;
  };
}

interface Permission {
  id: number;
  code: string;
}

interface User {
  id: string;
  email: string;
  user_type: string;
  role?: {
    name: string;
  };
  is_email_verified: number;
  last_login_at: string | null;
}

export const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError 
  } = useUsers();
  
  const { 
    data: rolesData, 
    isLoading: rolesLoading, 
    error: rolesError 
  } = useRoles();
  
  const { 
    data: permissionsData, 
    isLoading: permsLoading, 
    error: permsError 
  } = usePermissions();

  const isLoading = authLoading || usersLoading || rolesLoading || permsLoading;
  const hasError = usersError || rolesError || permsError;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="alert alert-danger m-4" role="alert">
        <h4 className="alert-heading">Error Loading Dashboard</h4>
        <p>Failed to load admin data. Please try again.</p>
        <hr />
        <p className="mb-0">
          <small>
            Users: {usersError ? 'Failed' : 'OK'} | 
            Roles: {rolesError ? 'Failed' : 'OK'} | 
            Permissions: {permsError ? 'Failed' : 'OK'}
          </small>
        </p>
      </div>
    );
  }

  const users: User[] = usersData || [];
  const roles: Role[] = rolesData || [];
  const permissions: Permission[] = permissionsData || [];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0 text-gray-800">Admin Dashboard</h1>
          <div>
            <span className="badge bg-primary me-2 py-2 px-3 rounded-5">
              Admin: {user?.email}
            </span>
            <span className="badge bg-secondary  me-2 py-2 px-3 rounded-5">
              Role: {user?.roleName}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-3">
          <div className="row gap-4 card-wrapper">
            <div className="col custom-card cc-1">
                <div className="title-text">Total Users</div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="value-text">6</div>
                    <a className="arrow-circle" href='javascript:void(0);'>                      
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.6667 11L22.6667 16M22.6667 16L17.6667 21M22.6667 16H9.33333M31 16C31 24.2843 24.2843 31 16 31C7.71573 31 1 24.2843 1 16C1 7.71567 7.71573 1 16 1C24.2843 1 31 7.71567 31 16Z" stroke="#B4A37A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                </div>
            </div>

            <div className="col custom-card cc-2">
                <div className="title-text">Total Roles</div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="value-text">5</div>
                    <a className="arrow-circle" href='javascript:void(0);'>                      
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.6667 11L22.6667 16M22.6667 16L17.6667 21M22.6667 16H9.33333M31 16C31 24.2843 24.2843 31 16 31C7.71573 31 1 24.2843 1 16C1 7.71567 7.71573 1 16 1C24.2843 1 31 7.71567 31 16Z" stroke="#B4A37A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                </div>
            </div>

            <div className="col custom-card cc-3">
                <div className="title-text">Total Permissions</div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="value-text">1</div>
                    <a className="arrow-circle" href='javascript:void(0);'>                      
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.6667 11L22.6667 16M22.6667 16L17.6667 21M22.6667 16H9.33333M31 16C31 24.2843 24.2843 31 16 31C7.71573 31 1 24.2843 1 16C1 7.71567 7.71573 1 16 1C24.2843 1 31 7.71567 31 16Z" stroke="#B4A37A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                </div>
            </div>

            <div className="col custom-card cc-4">
                <div className="title-text">Investment<br />Tracking</div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="value-text">5</div>
                    <a className="arrow-circle" href='javascript:void(0);'>                      
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.6667 11L22.6667 16M22.6667 16L17.6667 21M22.6667 16H9.33333M31 16C31 24.2843 24.2843 31 16 31C7.71573 31 1 24.2843 1 16C1 7.71567 7.71573 1 16 1C24.2843 1 31 7.71567 31 16Z" stroke="#B4A37A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                </div>
            </div>

            <div className="col custom-card cc-5">
                <div className="title-text">Udyog Mitra</div>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="value-text">20</div>
                    <a className="arrow-circle" href='javascript:void(0);'>                      
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.6667 11L22.6667 16M22.6667 16L17.6667 21M22.6667 16H9.33333M31 16C31 24.2843 24.2843 31 16 31C7.71573 31 1 24.2843 1 16C1 7.71567 7.71573 1 16 1C24.2843 1 31 7.71567 31 16Z" stroke="#B4A37A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                </div>
            </div>
        </div>
        </div>

        <div className="row mb-4 d-none">
          <div className="col-md-4 mb-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-primary text-white p-3 rounded">
                      <i className="bi bi-people-fill fs-4"></i>
                    </div>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">Total Users</div>
                    <div className="h3 mb-0">{users.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success text-white p-3 rounded">
                      <i className="bi bi-person-badge fs-4"></i>
                    </div>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">Total Roles</div>
                    <div className="h3 mb-0">{roles.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning text-white p-3 rounded">
                      <i className="bi bi-shield-lock fs-4"></i>
                    </div>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">Total Permissions</div>
                    <div className="h3 mb-0">{permissions.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card shadow-sm mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Recent Users</h5>
            <small className="text-muted">Last 10 users</small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>ID</th>
                    <th>Email</th>
                    <th>User Type</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((user: User) => (
                    <tr key={user.id}>
                      <td>#{user.id}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="badge bg-info">{user.user_type}</span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{user.role?.name || 'N/A'}</span>
                      </td>
                      <td>
                        {user.is_email_verified ? (
                          <span className="badge bg-success">Verified</span>
                        ) : (
                          <span className="badge bg-warning">Pending</span>
                        )}
                      </td>
                      <td>
                        {user.last_login_at ? 
                          new Date(user.last_login_at).toLocaleDateString() : 
                          'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Roles & Permissions */}
        <div className="row">
          <div className="col-md-6 mb-3">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="mb-0">Available Roles</h5>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {roles.map((role: Role) => (
                    <span key={role.id} className="badge bg-primary">
                      {role.name}
                      <span className="ms-2 bg-light text-dark rounded px-1">
                        {role._count?.users || 0}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="mb-0">Available Permissions</h5>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {permissions.map((perm: Permission) => (
                    <span key={perm.id} className="badge bg-secondary">
                      {perm.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};
