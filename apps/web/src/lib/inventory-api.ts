import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustInventoryDto,
} from '@restaurant/shared';

type InventoryItemWithStatus = InventoryItem & { lowStock: boolean };

export const inventoryKeys = {
  all: () => ['inventory'] as const,
  one: (id: string) => ['inventory', id] as const,
};

export function useInventory() {
  return useQuery({
    queryKey: inventoryKeys.all(),
    queryFn: () => apiClient.get<InventoryItemWithStatus[]>('/inventory').then((r) => r.data),
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.one(id),
    queryFn: () => apiClient.get<InventoryItemWithStatus>(`/inventory/${id}`).then((r) => r.data),
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInventoryItemDto) =>
      apiClient.post<InventoryItemWithStatus>('/inventory', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInventoryItemDto }) =>
      apiClient.patch<InventoryItemWithStatus>(`/inventory/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/inventory/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}

export function useAdjustInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AdjustInventoryDto }) =>
      apiClient.post<InventoryItemWithStatus>(`/inventory/${id}/adjust`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all() }),
  });
}
