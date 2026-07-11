import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

interface MockRequestConfig {
  url: string;
  method: string;
  data?: unknown;
}

const customInstance = vi.fn();
const toast = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  customInstance: (config: MockRequestConfig) => customInstance(config),
  default: (config: MockRequestConfig) => customInstance(config),
}));

vi.mock('sonner', () => ({ toast: (...args: unknown[]) => toast(...args) }));

import { Route } from './index';

const KdsPage = Route.options.component as () => ReactNode;

const mockTickets = [
  {
    orderId: 'order-1',
    tableNumber: 5,
    firedAt: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        name: 'Burger',
        quantity: 1,
        station: 'grill',
        status: 'pending',
        modifiers: [],
      },
    ],
  },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('KDS bump undo window', () => {
  beforeEach(() => {
    customInstance.mockReset();
    toast.mockReset();
    customInstance.mockImplementation((config: MockRequestConfig) => {
      if (config.method === 'GET' && config.url === '/api/kds/tickets') {
        return Promise.resolve(mockTickets);
      }
      if (config.method === 'PATCH' && config.url.includes('/status')) {
        return Promise.resolve({});
      }

      return Promise.reject(new Error(`unexpected request ${config.method} ${config.url}`));
    });
  });

  it('shows an Undo toast on bump, and Undo re-fires the mutation with the prior status', async () => {
    render(<KdsPage />, { wrapper });

    const bumpButton = await screen.findByText('1× Burger');

    fireEvent.click(bumpButton);

    await waitFor(() =>
      expect(customInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/orders/order-1/items/item-1/status',
          method: 'PATCH',
          data: { status: 'ready' },
        }),
      ),
    );

    await waitFor(() => expect(toast).toHaveBeenCalled());
    const [message, options] = toast.mock.calls[0];

    expect(message).toBe('Item marked ready');
    expect(options.action.label).toBe('Undo');

    customInstance.mockClear();
    options.action.onClick();

    await waitFor(() =>
      expect(customInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/orders/order-1/items/item-1/status',
          method: 'PATCH',
          data: { status: 'pending' },
        }),
      ),
    );
  });
});

const stationTickets = [
  {
    orderId: 'order-10',
    tableNumber: 1,
    firedAt: new Date().toISOString(),
    items: [
      { id: 'g-1', name: 'Steak', quantity: 1, station: 'grill', status: 'pending', modifiers: [] },
      { id: 'c-1', name: 'Salad', quantity: 1, station: 'cold', status: 'pending', modifiers: [] },
    ],
  },
  {
    orderId: 'order-11',
    tableNumber: 2,
    firedAt: new Date().toISOString(),
    items: [
      { id: 'b-1', name: 'Mojito', quantity: 2, station: 'bar', status: 'pending', modifiers: [] },
    ],
  },
];

describe('KDS per-station columns', () => {
  beforeEach(() => {
    customInstance.mockReset();
    toast.mockReset();
    customInstance.mockImplementation((config: MockRequestConfig) => {
      if (config.method === 'GET' && config.url === '/api/kds/tickets') {
        return Promise.resolve(stationTickets);
      }

      return Promise.reject(new Error(`unexpected request ${config.method} ${config.url}`));
    });
  });

  it('renders tickets grouped into independent station columns in the "all" view', async () => {
    render(<KdsPage />, { wrapper });

    // The Steak item (grill) renders in both the Grill column (bumpable) and the Cold
    // column (dimmed, since order-10 also has a Cold item) — expect both occurrences.
    await screen.findAllByText('1× Steak');

    expect(screen.getByRole('heading', { name: 'Grill' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cold' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pass' })).toBeInTheDocument();

    // order-10 has items on both Grill and Cold, so its card renders independently in both columns.
    expect(screen.getAllByText('Table 1')).toHaveLength(2);
    // order-11 only has a Bar item.
    expect(screen.getAllByText('Table 2')).toHaveLength(1);
    // No ticket has a Pass item.
    expect(screen.getByText('No tickets')).toBeInTheDocument();
  });
});
