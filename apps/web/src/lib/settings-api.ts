import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { RestaurantSettings, UpdateSettingsDto } from '@restaurant/shared';

const KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<RestaurantSettings>('/settings').then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateSettingsDto) =>
      apiClient.patch<RestaurantSettings>('/settings', dto).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
