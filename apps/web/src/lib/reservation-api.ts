import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client'
import type { Reservation, CreateReservationDto, UpdateReservationDto } from '@restaurant/shared'

export const reservationKeys = {
  all: (date?: string) => ['reservations', date] as const,
  one: (id: string) => ['reservations', id] as const,
}

export function useReservations(date?: string) {
  return useQuery({
    queryKey: reservationKeys.all(date),
    queryFn: () =>
      apiClient.get<Reservation[]>('/reservations', { params: date ? { date } : undefined }).then(r => r.data),
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateReservationDto) =>
      apiClient.post<Reservation>('/reservations', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateReservationDto }) =>
      apiClient.patch<Reservation>(`/reservations/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}

export function useDeleteReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reservations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  })
}
