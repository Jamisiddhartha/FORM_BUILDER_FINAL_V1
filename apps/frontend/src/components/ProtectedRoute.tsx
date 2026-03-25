'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/navigation';
import { ReactNode, useEffect, useMemo,useState,useRef } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string; // Use role name like 'admin', 'investor'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, roles, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthorized = useMemo(() => {
    if (loading) return true; // Wait for loading to finish
    if (!user) return false; // Not logged in
    if (!requiredRole) return true; // No specific role required

    if (!roles || roles.length === 0) return false; // Roles not loaded yet

    const role = roles.find(r => r.name.toLowerCase() === requiredRole.toLowerCase());

    // If the required role doesn't exist in the system, deny access
    if (!role) {
      console.error(`Required role '${requiredRole}' not found in system roles.`);
      return false;
    }

    // Safety check: Prevent investors from accessing admin routes
    // This handles cases where data might be inconsistent
    if (requiredRole.toLowerCase() === 'admin' && (user.userType === 'INVESTOR' || user.email.includes('investor'))) {
      return false;
    }

    // Check if user has the required role ID
    return user.roleId === role.id;
  }, [user, roles, loading, requiredRole]);

  useEffect(() => {
    if (!loading && !isAuthorized) {
      if (!user) {
        router.push('/login');
      } else {
        // User is logged in but unauthorized
        // We can redirect them to their appropriate dashboard or show unauthorized
        // For now, we let the render logic show the "Unauthorized Access" message
      }
    }
  }, [loading, isAuthorized, user, router]);

  if (loading) return <div className="d-flex justify-content-center p-5"><div className="spinner-border text-primary" role="status"></div></div>;

  if (!user) return null; // Will redirect in useEffect

  if (!isAuthorized) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>Unauthorized Access</strong>
            <p className="mb-0">You do not have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
