import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const base = '/master/form-categories';
const key = ['form-categories']; // <- specific

export function useFormCategories() {
  return useQuery({ queryKey: key, queryFn: async () => (await apiClient.get(base)).data });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => (await apiClient.post(base, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await apiClient.put(`${base}/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`${base}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useToggleCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.put(`${base}/${id}/toggle`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
