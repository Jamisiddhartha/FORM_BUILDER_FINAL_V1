import { create } from 'zustand';

export const ACCESS_TOKEN_STORAGE_KEY = 'swcs.accessToken';

export const readAccessTokenFromStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeAccessTokenToStorage = (accessToken: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep the in-memory auth state working.
  }
};

interface User {
  id: string;
  email: string;
  userType: string;
  roleId: number;
  roleName: string;
  isEmailVerified: number;
  lastLoginAt: string;
  firstName?: string;
  lastName?: string;
  deptId?: number;
}

interface Role {
  id: number;
  name: string;
}

interface Resource {
  code: string;
  path: string;
}

interface AuthState {
  user: User | null;
  roles: Role[]; // All available roles from DB
  resources: Resource[]; // Resources assigned to the current user
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  hasFetched: boolean; // Track if initial fetch has been attempted
  setUser: (user: User | null) => void;
  setRoles: (roles: Role[]) => void;
  setResources: (resources: Resource[]) => void;
  setAccessToken: (accessToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasFetched: (hasFetched: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  roles: [],
  resources: [],
  accessToken: readAccessTokenFromStorage(),
  loading: true,
  error: null,
  hasFetched: false,
  setUser: (user) => set({ user }),
  setRoles: (roles) => set({ roles }),
  setResources: (resources) => set({ resources }),
  setAccessToken: (accessToken) => {
    writeAccessTokenToStorage(accessToken);
    set({ accessToken });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setHasFetched: (hasFetched) => set({ hasFetched }),
}));
