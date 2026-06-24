import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusDot } from './status';

describe('StatusBadge', () => {
  it('renders the default label for a status', () => {
    render(<StatusBadge status="needs-you" />);
    expect(screen.getByText('Needs you')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<StatusBadge status="open" label="Available" />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });
});

describe('StatusDot', () => {
  it('applies the status color class', () => {
    const { container } = render(<StatusDot status="waiting" />);

    expect(container.firstChild).toHaveClass('bg-warning');
  });
});
