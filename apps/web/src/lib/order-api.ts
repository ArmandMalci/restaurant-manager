import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  Order,
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
} from '@restaurant/shared';

export const orderKeys = {
  all: (status?: string) => ['orders', status] as const,
  one: (id: string) => ['orders', id] as const,
};

export function useOrders(status?: string) {
  return useQuery({
    queryKey: orderKeys.all(status),
    queryFn: () =>
      apiClient
        .get<Order[]>('/orders', { params: status ? { status } : undefined })
        .then((r) => r.data),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => apiClient.post<Order>('/orders', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderStatusDto }) =>
      apiClient.patch<Order>(`/orders/${id}/status`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useUpdateItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      dto,
    }: {
      orderId: string;
      itemId: string;
      dto: UpdateOrderItemStatusDto;
    }) => apiClient.patch(`/orders/${orderId}/items/${itemId}/status`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
