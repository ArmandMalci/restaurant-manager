import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Service" />);
    expect(screen.getByRole('heading', { name: 'Service' })).toBeInTheDocument();
  });

  it('renders the subtitle and action', () => {
    render(
      <PageHeader
        title="Menu"
        subtitle="20 items"
        action={<button type="button">Add item</button>}
      />,
    );
    expect(screen.getByText('20 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });
});
