import axios, { AxiosError, AxiosInstance } from 'axios';
import { readAccessTokenFromStorage, useAuthStore } from '@/store/authStore';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const accessToken =
      useAuthStore.getState().accessToken || readAccessTokenFromStorage();

    if (accessToken) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${accessToken}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData && config.headers) {
      delete (config.headers as any)['Content-Type'];
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().setAccessToken(null);

      if (typeof window !== 'undefined') {
        console.log('Unauthorized - redirecting to login');
      }
    }

    if (error.response?.status === 403 && typeof window !== 'undefined') {
      console.log('Forbidden - Access denied to resource');
    }

    return Promise.reject(error);
  },
);

export default apiClient;
