import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { Bill, CreateBillDto } from '@restaurant/shared';

const billKey = (id: string) => ['bills', id] as const;

export function useBill(id: string) {
  return useQuery({
    queryKey: billKey(id),
    queryFn: () => apiClient.get<Bill>(`/billing/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useCreateBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBillDto) => apiClient.post<Bill>('/billing', dto).then((r) => r.data),
    onSuccess: (bill) => {
      qc.setQueryData(billKey(bill.id), bill);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function usePayBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Bill>(`/billing/${id}/pay`).then((r) => r.data),
    onSuccess: (bill) => qc.setQueryData(billKey(bill.id), bill),
  });
}
