'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { readAccessTokenFromStorage, useAuthStore } from '@/store/authStore';
import { useRouter } from '@/navigation';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const autoLogoutRef = useRef(false);

  const {
    user,
    roles,
    resources,
    accessToken,
    hasFetched,
    setUser,
    setRoles,
    setResources,
    setAccessToken,
    setLoading,
    setError,
    setHasFetched,
  } = useAuthStore();

  const isPublicRoute =
    pathname === '/' ||
    pathname === `/${locale}` ||
    pathname?.includes('/login') ||
    pathname?.includes('/register') ||
    pathname?.includes('/forgot-password') ||
    pathname?.includes('/reset-password') ||
    pathname?.includes('/resend-activation') ||
    pathname?.includes('/verify-email') ||
    pathname?.includes('/know-your-incentive') ||
    pathname?.includes('/incentive-calculator') ||
    pathname?.includes('/incentive-report') ||
    pathname?.includes('/kya');

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileAuthError,
  } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/auth/profile', { timeout: 8000 });
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 401) {
          return { unauthenticated: true };
        }

        throw err;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isActuallyUnauthorized =
    profileData?.unauthenticated || (profileAuthError as any)?.response?.status === 401;

  const { data: rolesData, refetch: fetchRolesQuery } = useQuery({
    queryKey: ['auth', 'roles'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/roles');
      return response.data.data || [];
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
    enabled: !!profileData && !profileData.unauthenticated,
  });

  useEffect(() => {
    if (isProfileLoading) {
      setLoading(true);
      return;
    }

    setLoading(false);
    setHasFetched(true);

    if (profileData && !profileData.unauthenticated) {
      setUser({
        id: profileData.user.id,
        email: profileData.user.email,
        userType: profileData.user.userType,
        roleId: profileData.user.roleId,
        roleName: profileData.user.roleName,
        isEmailVerified: profileData.user.isEmailVerified,
        lastLoginAt: profileData.user.lastLoginAt,
        firstName: profileData.profile?.firstName || profileData.profile?.fullName || '',
        lastName: profileData.profile?.lastName || '',
        deptId: profileData.profile?.deptId,
      });

      if (profileData.resources) {
        setResources(profileData.resources);
      }

      setError(null);
    }

    if (rolesData) {
      setRoles(rolesData);
    }
  }, [
    profileData,
    rolesData,
    isProfileLoading,
    setUser,
    setResources,
    setRoles,
    setLoading,
    setError,
    setHasFetched,
  ]);

  useEffect(() => {
    if (isProfileError || profileData?.unauthenticated) {
      const existingUser = useAuthStore.getState().user;
      const activeToken =
        useAuthStore.getState().accessToken || readAccessTokenFromStorage();

      if (existingUser && activeToken) {
        queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
        return;
      }

      setAccessToken(null);
      setUser(null);
      setResources([]);
      setError(isActuallyUnauthorized ? 'Not authenticated' : 'Access denied');

      if (isActuallyUnauthorized && !isPublicRoute) {
        router.replace('/login');
      }
    }
  }, [
    isProfileError,
    isActuallyUnauthorized,
    profileData,
    setAccessToken,
    setUser,
    setResources,
    setError,
    isPublicRoute,
    router,
    queryClient,
  ]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      queryClient.removeQueries({ queryKey: ['auth'] });
      setHasFetched(false);
      setAccessToken(null);
      setUser(null);
      setRoles([]);
      setResources([]);
      setError(null);
      setLoading(false);

      if (typeof window !== 'undefined') {
        window.location.href = `/${locale}/login`;
        return;
      }

      router.replace('/login');
    }
  }, [
    queryClient,
    setUser,
    setRoles,
    setResources,
    setAccessToken,
    setError,
    setLoading,
    setHasFetched,
    router,
    locale,
  ]);

  useEffect(() => {
    if (autoLogoutRef.current) {
      return;
    }

    if (!isProfileLoading && isActuallyUnauthorized && !isPublicRoute) {
      const existingUser = useAuthStore.getState().user;
      const activeToken =
        useAuthStore.getState().accessToken || readAccessTokenFromStorage();

      if (existingUser && activeToken) {
        queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
        return;
      }

      autoLogoutRef.current = true;
      logout();
    }
  }, [isProfileLoading, isActuallyUnauthorized, isPublicRoute, logout, queryClient]);

  const isLoading = isProfileLoading || !hasFetched;

  return {
    user,
    roles,
    resources,
    accessToken,
    loading: isLoading,
    error: isProfileError ? 'Authentication error' : null,
    setUser,
    setRoles,
    setResources,
    setAccessToken,
    setLoading,
    setError,
    logout,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] }),
    fetchRoles: fetchRolesQuery,
  };
}
