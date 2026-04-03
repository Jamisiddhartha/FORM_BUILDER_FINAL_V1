import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { MasterColumnDefinition } from '@/hooks/master/useColumnDefinitions';

export interface TenantV2 {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  plan: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  settings?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
  masterDefinitionCount?: number;
}

export interface TenantProjectV2 {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Pick<TenantV2, 'id' | 'name' | 'slug'>;
  masterDefinitionCount?: number;
}

export interface MasterDefinitionV2 {
  id: number;
  tenantId: number;
  projectId?: number | null;
  name: string;
  code: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  isSystem: boolean;
  allowImport: boolean;
  displayOrder: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Pick<TenantV2, 'id' | 'name' | 'slug'>;
  project?: Pick<TenantProjectV2, 'id' | 'tenantId' | 'name' | 'code' | 'isActive'> | null;
  columnDefinitions?: MasterColumnDefinition[];
  _count?: {
    masterData: number;
  };
}

export interface MasterDataReferenceV2 {
  id: string;
  fromDataId: string;
  toDataId: string;
  columnKey: string;
  fromData?: MasterDataEntryV2;
  toData?: MasterDataEntryV2;
}

export interface MasterDataEntryV2 {
  id: string;
  masterId: number;
  tenantId: number;
  data: Record<string, unknown>;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  referencesFrom?: MasterDataReferenceV2[];
  referencesTo?: MasterDataReferenceV2[];
}

export interface MasterDefinitionDetailV2 extends MasterDefinitionV2 {
  masterData?: MasterDataEntryV2[];
}

const tenantsKey = () => ['mdm', 'v2', 'tenants'] as const;

const tenantProjectsKey = (tenantId?: number) =>
  ['mdm', 'v2', 'tenant-projects', tenantId ?? 'all'] as const;

const definitionsKey = (tenantId?: number, projectId?: number | null, isActive?: boolean) =>
  ['mdm', 'v2', 'definitions', tenantId ?? 'all', projectId ?? 'all', isActive ?? 'all'] as const;

const definitionKey = (id?: number) => ['mdm', 'v2', 'definition', id ?? 'none'] as const;

const dataKey = (masterId?: number, tenantId?: number, isActive?: boolean) =>
  ['mdm', 'v2', 'data', masterId ?? 'none', tenantId ?? 'all', isActive ?? 'all'] as const;

const buildQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const useTenants = () =>
  useQuery<TenantV2[]>({
    queryKey: tenantsKey(),
    queryFn: async () => (await apiClient.get('/master/master-data-management/v2/tenants')).data,
  });

export const useTenantProjects = (tenantId?: number) =>
  useQuery<TenantProjectV2[]>({
    queryKey: tenantProjectsKey(tenantId),
    queryFn: async () => {
      const suffix = buildQuery({ tenantId });
      return (await apiClient.get(`/master/master-data-management/v2/projects${suffix}`)).data;
    },
    enabled: tenantId !== undefined && tenantId !== null,
  });

export const useMasterDefinitions = (
  tenantId?: number,
  projectId?: number | null,
  isActive?: boolean,
) =>
  useQuery<MasterDefinitionV2[]>({
    queryKey: definitionsKey(tenantId, projectId, isActive),
    queryFn: async () => {
      const suffix = buildQuery({
        tenantId,
        projectId: projectId ?? undefined,
        isActive,
      });
      return (await apiClient.get(`/master/master-data-management/v2/definitions${suffix}`)).data;
    },
    enabled: tenantId !== undefined && tenantId !== null,
  });

export const useMasterDefinition = (id?: number) =>
  useQuery<MasterDefinitionDetailV2>({
    queryKey: definitionKey(id),
    queryFn: async () =>
      (await apiClient.get(`/master/master-data-management/v2/definitions/${id}`)).data,
    enabled: !!id,
  });

export const useCreateMasterDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await apiClient.post('/master/master-data-management/v2/definitions', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
    },
  });
};

export const useUpdateMasterDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Record<string, unknown>;
    }) =>
      (await apiClient.put(`/master/master-data-management/v2/definitions/${id}`, data)).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.id) });
    },
  });
};

export const useDeleteMasterDefinition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.delete(`/master/master-data-management/v2/definitions/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
    },
  });
};

export const useMasterDataEntries = (
  masterId?: number,
  tenantId?: number,
  isActive?: boolean,
) =>
  useQuery<MasterDataEntryV2[]>({
    queryKey: dataKey(masterId, tenantId, isActive),
    queryFn: async () => {
      const suffix = buildQuery({ tenantId, isActive });
      return (
        await apiClient.get(
          `/master/master-data-management/v2/masters/${masterId}/data${suffix}`,
        )
      ).data;
    },
    enabled: !!masterId && tenantId !== undefined && tenantId !== null,
  });

export const useCreateMasterDataEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      (await apiClient.post('/master/master-data-management/v2/data', data)).data,
    onSuccess: (_, variables) => {
      const masterId = Number(variables.masterId);
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'data', masterId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
      queryClient.invalidateQueries({ queryKey: definitionKey(masterId) });
    },
  });
};

export const useUpdateMasterDataEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      masterId,
      data,
    }: {
      id: string;
      masterId: number;
      data: Record<string, unknown>;
    }) =>
      (await apiClient.put(`/master/master-data-management/v2/data/${id}`, data)).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'data', variables.masterId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.masterId) });
    },
  });
};

export const useDeleteMasterDataEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      masterId,
    }: {
      id: string;
      masterId: number;
    }) =>
      (await apiClient.delete(`/master/master-data-management/v2/data/${id}`)).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'data', variables.masterId] });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.masterId) });
    },
  });
};

export const useCreateMasterDataReference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fromDataId,
      toDataId,
      columnKey,
    }: {
      fromDataId: string;
      toDataId: string;
      columnKey: string;
      masterId: number;
    }) =>
      (
        await apiClient.post('/master/master-data-management/v2/references', {
          fromDataId,
          toDataId,
          columnKey,
        })
      ).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mdm', 'v2', 'data', variables.masterId],
      });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.masterId) });
    },
  });
};

export const useDeleteMasterDataReference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      masterId,
    }: {
      id: string;
      masterId: number;
    }) =>
      (await apiClient.delete(`/master/master-data-management/v2/references/${id}`)).data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mdm', 'v2', 'data', variables.masterId],
      });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.masterId) });
    },
  });
};

export const useImportMasterDataCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      masterId,
      tenantId,
      projectId,
      file,
    }: {
      masterId: number;
      tenantId: number;
      projectId?: number | null;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      const suffix = buildQuery({
        tenantId,
        projectId: projectId ?? undefined,
      });
      return (
        await apiClient.post(
          `/master/master-data-management/v2/masters/${masterId}/import-csv${suffix}`,
          formData,
        )
      ).data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['mdm', 'v2', 'data', variables.masterId],
      });
      queryClient.invalidateQueries({ queryKey: ['mdm', 'v2', 'definitions'] });
      queryClient.invalidateQueries({ queryKey: definitionKey(variables.masterId) });
    },
  });
};
