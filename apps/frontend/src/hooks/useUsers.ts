import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { User } from '@/types/user';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users');
      return response.data?.data ?? response.data;
    },
  });
};

export const useCreateUser = () => {
  return useMutation({
    mutationFn: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiClient.post('/admin/users', data),
  });
};

export const useUpdateUser = () => {
  return useMutation({
    mutationFn: (data: { id: number; data: Partial<User> }) =>
      apiClient.put(`/admin/users/${data.id}`, data.data),
  });
};

export const useDeleteUser = () => {
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/admin/users/${id}`),
  });
};
