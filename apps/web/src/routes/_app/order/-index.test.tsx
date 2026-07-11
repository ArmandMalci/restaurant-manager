import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { OrderDto } from '@/api/restaurantManagerAPI.schemas';

const mutateRemove = vi.fn();

vi.mock('@/api/orders/orders', () => ({
  useOrderControllerGetAll: vi.fn(),
  useOrderControllerUpdateStatus: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOrderControllerUpdateItemStatus: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOrderControllerRemove: vi.fn(() => ({ mutate: mutateRemove, isPending: false })),
  invalidateOrderControllerGetAll: vi.fn(),
}));

import { OrderCard } from './index';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const order: OrderDto = {
  id: 'order-1',
  tableId: 'table-1',
  status: 'draft',
  notes: null,
  createdAt: new Date().toISOString(),
  items: [],
} as unknown as OrderDto;

describe('OrderCard delete confirmation', () => {
  beforeEach(() => {
    mutateRemove.mockReset();
  });

  it('never calls window.confirm and does not delete until the dialog is confirmed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<OrderCard order={order} tableNumber={4} menuNameMap={new Map()} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Delete order' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mutateRemove).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this order?')).toBeInTheDocument();
  });

  it('fires the delete mutation only after AlertDialogAction is clicked', () => {
    render(<OrderCard order={order} tableNumber={4} menuNameMap={new Map()} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Delete order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mutateRemove).toHaveBeenCalledWith(
      { id: 'order-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('closes without deleting when Cancel is clicked', () => {
    render(<OrderCard order={order} tableNumber={4} menuNameMap={new Map()} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Delete order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mutateRemove).not.toHaveBeenCalled();
  });
});
