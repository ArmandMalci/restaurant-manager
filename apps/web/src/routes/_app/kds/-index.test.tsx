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
