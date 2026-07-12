import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ManageSectionsModal } from './-manage-sections-modal';
import type { SectionDto } from '@/api/restaurantManagerAPI.schemas';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sections: SectionDto[] = [
  { id: 's1', name: 'Main Room', sortOrder: 0 },
  { id: 's2', name: 'Patio', sortOrder: 1 },
];

describe('ManageSectionsModal delete guard (Plan 17 Task 2)', () => {
  it('disables delete with an explanatory tooltip when the section has tables', () => {
    render(
      <ManageSectionsModal
        open
        onOpenChange={vi.fn()}
        sections={sections}
        tableCountBySection={new Map([['s1', 3]])}
      />,
      { wrapper },
    );

    const deleteButton = screen.getByRole('button', { name: 'Delete Main Room' });

    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', 'Move or delete its tables first');
  });

  it('leaves delete enabled for a section with no tables', () => {
    render(
      <ManageSectionsModal
        open
        onOpenChange={vi.fn()}
        sections={sections}
        tableCountBySection={new Map([['s1', 3]])}
      />,
      { wrapper },
    );

    const deleteButton = screen.getByRole('button', { name: 'Delete Patio' });

    expect(deleteButton).not.toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', 'Delete section');
  });

  it('shows the table count next to each section', () => {
    render(
      <ManageSectionsModal
        open
        onOpenChange={vi.fn()}
        sections={sections}
        tableCountBySection={new Map([['s1', 3]])}
      />,
      { wrapper },
    );

    expect(screen.getByText('3 tables')).toBeInTheDocument();
    expect(screen.getByText('0 tables')).toBeInTheDocument();
  });
});
