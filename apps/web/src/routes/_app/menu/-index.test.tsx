import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const customInstance = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  customInstance: (...args: unknown[]) => customInstance(...args),
  default: (...args: unknown[]) => customInstance(...args),
}));

import { useMenuControllerGetCategories } from '@/api/menu/menu';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useMenuControllerGetCategories();

  return <div>{isSuccess ? `count:${(data as unknown[])?.length ?? 0}` : 'loading'}</div>;
}

describe('menu generated hooks', () => {
  beforeEach(() => customInstance.mockReset());

  it('useMenuControllerGetCategories issues GET /api/menu/categories via customInstance', async () => {
    customInstance.mockResolvedValueOnce([{ id: '1', name: 'Drinks', sortOrder: 0 }]);
    render(<Probe />, { wrapper });
    await waitFor(() => expect(screen.getByText('count:1')).toBeInTheDocument());
    expect(customInstance).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/menu/categories', method: 'GET' }),
    );
  });
});
