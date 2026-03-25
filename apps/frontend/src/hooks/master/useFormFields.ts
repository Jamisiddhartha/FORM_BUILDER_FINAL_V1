
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const base = '/master/form-fields';

export function useFormFields() {
  return useQuery({
    queryKey: ['form-fields'],
    queryFn: async () => (await apiClient.get(base)).data,
  });
}

export function useCreateFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => (await apiClient.post(base, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields'] }),
  });
}

export function useUpdateFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await apiClient.put(`${base}/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields'] }),
  });
}

export function useDeleteFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`${base}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields'] }),
  });
}

export function useToggleFormField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.put(`${base}/${id}/toggle`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields'] }),
  });
}
