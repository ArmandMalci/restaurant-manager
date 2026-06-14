import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '@restaurant/shared';

export const staffKeys = {
  all: (role?: string) => ['staff', role] as const,
  one: (id: string) => ['staff', id] as const,
};

export function useStaff(role?: string) {
  return useQuery({
    queryKey: staffKeys.all(role),
    queryFn: () =>
      apiClient.get<Staff[]>('/staff', { params: role ? { role } : undefined }).then((r) => r.data),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStaffDto) => apiClient.post<Staff>('/staff', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStaffDto }) =>
      apiClient.patch<Staff>(`/staff/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useSetStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch<Staff>(`/staff/${id}/active`, { active }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
