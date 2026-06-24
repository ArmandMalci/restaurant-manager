import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCell } from './metric-cell';

describe('MetricCell', () => {
  it('renders the label and value', () => {
    render(<MetricCell label="Covers seated" value="42 / 80" />);
    expect(screen.getByText('Covers seated')).toBeInTheDocument();
    expect(screen.getByText('42 / 80')).toBeInTheDocument();
  });

  it('renders the optional sub line', () => {
    render(<MetricCell label="Kitchen load" value="6" sub="8m oldest" />);
    expect(screen.getByText('8m oldest')).toBeInTheDocument();
  });
});
