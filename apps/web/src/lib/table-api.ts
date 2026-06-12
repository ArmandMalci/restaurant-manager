import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client'
import type { Table, CreateTableDto, UpdateTableDto, SetTableStatusDto } from '@restaurant/shared'

export const tableKeys = {
  all: ['tables'] as const,
  one: (id: string) => ['tables', id] as const,
}

export function useTables() {
  return useQuery({
    queryKey: tableKeys.all,
    queryFn: () => apiClient.get<Table[]>('/tables').then(r => r.data),
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTableDto) =>
      apiClient.post<Table>('/tables', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  })
}

export function useUpdateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTableDto }) =>
      apiClient.patch<Table>(`/tables/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  })
}

export function useSetTableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SetTableStatusDto }) =>
      apiClient.patch<Table>(`/tables/${id}/status`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tableKeys.all }),
  })
}
