import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';

export type ReportSummary = {
  ordersByStatus: Record<string, number>;
  tablesByStatus: Record<string, number>;
  reservationsToday: number;
  topItems: { menuItemId: string; name: string; totalQuantity: number }[];
};

export function useReportSummary() {
  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => apiClient.get<ReportSummary>('/reports/summary').then((r) => r.data),
    staleTime: 30_000,
  });
}
