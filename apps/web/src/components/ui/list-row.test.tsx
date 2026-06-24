import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListRow } from './list-row';

describe('ListRow', () => {
  it('renders title, subtitle, meta and action', () => {
    render(
      <ListRow
        title="Table 6 · 2 dishes ready"
        subtitle="Carbonara, Branzino"
        meta="2 min"
        action={<button type="button">Run</button>}
      />,
    );
    expect(screen.getByText('Table 6 · 2 dishes ready')).toBeInTheDocument();
    expect(screen.getByText('Carbonara, Branzino')).toBeInTheDocument();
    expect(screen.getByText('2 min')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
  });
});
