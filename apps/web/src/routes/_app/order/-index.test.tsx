import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { OrderDto } from '@/api/restaurantManagerAPI.schemas';

const mutateRemove = vi.fn();
const getAllOrders = vi.fn(() => ({ data: [] as OrderDto[], isLoading: false }));

vi.mock('@/api/orders/orders', () => ({
  useOrderControllerGetAll: (...args: unknown[]) => getAllOrders(...(args as [])),
  useOrderControllerUpdateStatus: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOrderControllerUpdateItemStatus: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useOrderControllerRemove: vi.fn(() => ({ mutate: mutateRemove, isPending: false })),
  invalidateOrderControllerGetAll: vi.fn(),
}));

vi.mock('@/api/tables/tables', () => ({
  useTableControllerGetAll: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/api/menu/menu', () => ({
  useMenuControllerGetItems: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { OrderCard, OrdersPageContent } from './index';

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

describe('order kanban column-jump control', () => {
  beforeEach(() => {
    getAllOrders.mockReturnValue({
      data: [
        { ...order, id: 'o1', status: 'draft' },
        { ...order, id: 'o2', status: 'ready' },
      ] as unknown as OrderDto[],
      isLoading: false,
    });
  });

  it('renders a jump pill for each of the 5 kanban statuses', () => {
    render(<OrdersPageContent />, { wrapper });

    for (const label of ['Draft', 'Sent', 'In Progress', 'Ready', 'Served']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('scrolls the tapped column into view, not just any column', () => {
    const scrollIntoView = vi.fn();

    Element.prototype.scrollIntoView = scrollIntoView;
    render(<OrdersPageContent />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', inline: 'start' }),
    );
    const scrolledElement = scrollIntoView.mock.instances[0] as HTMLElement;

    expect(scrolledElement.textContent).toContain('Ready');
    expect(scrolledElement.textContent).not.toContain('Draft');
  });
});
