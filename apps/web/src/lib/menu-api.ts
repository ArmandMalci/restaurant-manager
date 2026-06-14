import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type {
  MenuCategory,
  MenuItem,
  CreateMenuCategoryDto,
  UpdateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@restaurant/shared';

// ── Query keys ───────────────────────────────────────────────────────

export const menuKeys = {
  categories: ['menu', 'categories'] as const,
  items: (categoryId?: string) => ['menu', 'items', categoryId] as const,
};

// ── Category hooks ───────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: menuKeys.categories,
    queryFn: () => apiClient.get<MenuCategory[]>('/menu/categories').then((r) => r.data),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMenuCategoryDto) =>
      apiClient.post<MenuCategory>('/menu/categories', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuCategoryDto }) =>
      apiClient.patch<MenuCategory>(`/menu/categories/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/menu/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: menuKeys.categories }),
  });
}

// ── Item hooks ───────────────────────────────────────────────────────

export function useItems(categoryId?: string) {
  return useQuery({
    queryKey: menuKeys.items(categoryId),
    queryFn: () =>
      apiClient
        .get<MenuItem[]>('/menu/items', { params: categoryId ? { categoryId } : undefined })
        .then((r) => r.data),
  });
}

export function useCreateItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateMenuItemDto) =>
      apiClient.post<MenuItem>('/menu/items', dto).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: menuKeys.items(vars.categoryId) });
      qc.invalidateQueries({ queryKey: menuKeys.items() });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuItemDto }) =>
      apiClient.patch<MenuItem>(`/menu/items/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', 'items'] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/menu/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', 'items'] }),
  });
}

export function useToggleAvailability() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      apiClient
        .patch<MenuItem>(`/menu/items/${id}/availability`, { available })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', 'items'] }),
  });
}
