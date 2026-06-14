import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { Shift, CreateShiftDto, UpdateShiftDto } from '@restaurant/shared';

export const shiftKeys = {
  all: (from?: string, to?: string) => ['shifts', from, to] as const,
  one: (id: string) => ['shifts', id] as const,
};

export function useShifts(from?: string, to?: string) {
  return useQuery({
    queryKey: shiftKeys.all(from, to),
    queryFn: () =>
      apiClient
        .get<Shift[]>('/shifts', { params: from && to ? { from, to } : undefined })
        .then((r) => r.data),
  });
}

export function useCreateShift() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateShiftDto) => apiClient.post<Shift>('/shifts', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateShiftDto }) =>
      apiClient.patch<Shift>(`/shifts/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}
