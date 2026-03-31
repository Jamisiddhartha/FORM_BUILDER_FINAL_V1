import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface MasterDataProject {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  schemaName: string;
  isActive: boolean;
  definitionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubDepartment {
  id: number;
  departmentId: number;
  name: string;
  code?: string | null;
  isActive: boolean;
  department?: {
    id: number;
    name: string;
  };
}

export interface MasterDataDefinition {
  id: number;
  projectId: number;
  name: string;
  code: string;
  description?: string | null;
  schemaName: string;
  tableName: string;
  supportsHierarchy: boolean;
  hasValidityPeriod: boolean;
  mapDepartment: boolean;
  mapSubDepartment: boolean;
  defaultDepartmentId?: number | null;
  defaultSubDepartmentId?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  masterTableId?: number | null;
  isActive: boolean;
  recordCount?: number;
  project?: MasterDataProject;
  defaultDepartment?: { id: number; name: string } | null;
  defaultSubDepartment?: { id: number; name: string; departmentId: number } | null;
  masterTable?: { id: number; master_code: string; api_endpoint?: string | null } | null;
  uploadBatches?: MasterDataUploadBatch[];
}

export interface MasterDataUploadBatch {
  id: number;
  fileName: string;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errorReport?: Array<{ row: number; message: string }> | null;
  createdAt: string;
}

export interface MasterDataRecord {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  department_id?: number | null;
  sub_department_id?: number | null;
  department_name?: string | null;
  sub_department_name?: string | null;
  sort_order: number;
  metadata?: Record<string, unknown> | null;
  is_active: boolean;
  validityPeriod?: string;
}

export interface MasterDataTreeNode {
  key: string;
  data: MasterDataRecord;
  children: MasterDataTreeNode[];
}

export interface MasterDataRecordsResponse {
  definitionId: number;
  records: MasterDataRecord[];
  tree: MasterDataTreeNode[];
}

const invalidateDefinitions = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['mdm', 'definitions'] });
};

export const useMasterDataProjects = () =>
  useQuery<MasterDataProject[]>({
    queryKey: ['mdm', 'projects'],
    queryFn: async () => (await apiClient.get('/master/master-data-management/projects')).data,
  });

export const useCreateMasterDataProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      description?: string;
      isActive?: boolean;
    }) => (await apiClient.post('/master/master-data-management/projects', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'projects'] });
    },
  });
};

export const useUpdateMasterDataProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; description?: string; isActive?: boolean };
    }) => (await apiClient.put(`/master/master-data-management/projects/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'projects'] });
    },
  });
};

export const useToggleMasterDataProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.put(`/master/master-data-management/projects/${id}/toggle`, {})).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'projects'] });
    },
  });
};

export const useSubDepartments = (departmentId?: number) =>
  useQuery<SubDepartment[]>({
    queryKey: ['mdm', 'subdepartments', departmentId || 'all'],
    queryFn: async () => {
      const suffix = departmentId ? `?departmentId=${departmentId}` : '';
      return (await apiClient.get(`/master/master-data-management/sub-departments${suffix}`))
        .data;
    },
  });

export const useCreateSubDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      departmentId: number;
      name: string;
      code?: string;
      isActive?: boolean;
    }) => (await apiClient.post('/master/master-data-management/sub-departments', data)).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mdm', 'subdepartments', variables.departmentId],
      });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'subdepartments', 'all'] });
    },
  });
};

export const useMasterDataDefinitions = (projectId?: number, search?: string) =>
  useQuery<MasterDataDefinition[]>({
    queryKey: ['mdm', 'definitions', projectId || 'all', search || ''],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', String(projectId));
      if (search) params.append('search', search);
      return (await apiClient.get(`/master/master-data-management/definitions?${params}`)).data;
    },
  });

export const useMasterDataDefinition = (id?: number) =>
  useQuery<MasterDataDefinition & { records: MasterDataRecord[]; tree: MasterDataTreeNode[] }>({
    queryKey: ['mdm', 'definition', id],
    queryFn: async () => (await apiClient.get(`/master/master-data-management/definitions/${id}`)).data,
    enabled: !!id,
  });

export const useCreateMasterDataDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await apiClient.post('/master/master-data-management/definitions', data)).data,
    onSuccess: () => {
      invalidateDefinitions(queryClient);
      queryClient.invalidateQueries({ queryKey: ['mdm', 'projects'] });
    },
  });
};

export const useUpdateMasterDataDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      (await apiClient.put(`/master/master-data-management/definitions/${id}`, data)).data,
    onSuccess: (_, variables) => {
      invalidateDefinitions(queryClient);
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'records', variables.id] });
    },
  });
};

export const useToggleMasterDataDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.put(`/master/master-data-management/definitions/${id}/toggle`, {})).data,
    onSuccess: (_, id) => {
      invalidateDefinitions(queryClient);
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', id] });
    },
  });
};

export const useDeleteMasterDataDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.delete(`/master/master-data-management/definitions/${id}`)).data,
    onSuccess: () => {
      invalidateDefinitions(queryClient);
    },
  });
};

export const useMasterDataRecords = (definitionId?: number) =>
  useQuery<MasterDataRecordsResponse>({
    queryKey: ['mdm', 'records', definitionId],
    queryFn: async () =>
      (await apiClient.get(`/master/master-data-management/definitions/${definitionId}/records`))
        .data,
    enabled: !!definitionId,
  });

export const useCreateMasterDataRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      data,
    }: {
      definitionId: number;
      data: Record<string, unknown>;
    }) =>
      (
        await apiClient.post(
          `/master/master-data-management/definitions/${definitionId}/records`,
          data,
        )
      ).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'records', variables.definitionId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', variables.definitionId] });
      invalidateDefinitions(queryClient);
    },
  });
};

export const useUpdateMasterDataRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      recordId,
      data,
    }: {
      definitionId: number;
      recordId: number;
      data: Record<string, unknown>;
    }) =>
      (
        await apiClient.put(
          `/master/master-data-management/definitions/${definitionId}/records/${recordId}`,
          data,
        )
      ).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'records', variables.definitionId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', variables.definitionId] });
    },
  });
};

export const useDeleteMasterDataRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      recordId,
    }: {
      definitionId: number;
      recordId: number;
    }) =>
      (
        await apiClient.delete(
          `/master/master-data-management/definitions/${definitionId}/records/${recordId}`,
        )
      ).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'records', variables.definitionId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', variables.definitionId] });
      invalidateDefinitions(queryClient);
    },
  });
};

export const useUploadMasterDataCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      definitionId,
      file,
    }: {
      definitionId: number;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      return (
        await apiClient.post(
          `/master/master-data-management/definitions/${definitionId}/upload-csv`,
          formData,
        )
      ).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'records', variables.definitionId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'definition', variables.definitionId] });
      invalidateDefinitions(queryClient);
    },
  });
};
