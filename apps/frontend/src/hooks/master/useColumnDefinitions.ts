import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface MasterColumnDefinition {
  id: number;
  masterId: number;
  columnKey: string;
  columnLabel: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isListable: boolean;
  isFilterable: boolean;
  displayOrder: number;
  options?: Record<string, any>;
  validation?: Record<string, any>;
  defaultValue?: string;
  placeholder?: string;
  createdAt: string;
  updatedAt: string;
}

export const useColumnDefinitions = (masterId: number | null) => {
  return useQuery({
    queryKey: ['columnDefinitions', masterId],
    queryFn: async () => {
      if (!masterId) return [];
      const response = await apiClient.get(
        `/master/master-data-management/v2/definitions/${masterId}/columns`,
      );
      return response.data;
    },
    enabled: !!masterId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
