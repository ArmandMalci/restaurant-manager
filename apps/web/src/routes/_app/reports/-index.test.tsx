import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsPage } from './index';

const mockSummary = vi.fn();
const mockDaily = vi.fn();

vi.mock('@/api/reports/reports', () => ({
  useReportsControllerGetSummary: () => mockSummary(),
  useReportsControllerGetDaily: (params: { from: string; to: string }) => mockDaily(params),
}));

const emptySummary = {
  ordersByStatus: {},
  tablesByStatus: {},
  reservationsToday: 0,
  topItems: [],
};

beforeEach(() => {
  mockSummary.mockReturnValue({
    data: emptySummary,
    isLoading: false,
    refetch: vi.fn(),
    isFetching: false,
  });
  mockDaily.mockReturnValue({ data: [], isLoading: false, isError: false });
});

describe('ReportsPage', () => {
  it('calls the daily endpoint with the default date range and renders one row per day', () => {
    mockDaily.mockReturnValue({
      data: [
        { date: '2026-07-01', orderCount: 3, revenue: 100, reservationCount: 1 },
        { date: '2026-07-02', orderCount: 5, revenue: 0, reservationCount: 0 },
      ],
      isLoading: false,
      isError: false,
    });

    render(<ReportsPage />);

    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(mockDaily).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
  });

  it('re-queries the daily endpoint with the new range when the date inputs change', () => {
    const { container } = render(<ReportsPage />);
    const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');

    expect(dateInputs).toHaveLength(2);

    fireEvent.change(dateInputs[0], { target: { value: '2026-06-01' } });

    expect(mockDaily).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-06-01' }));
  });

  it('shows an empty state when there is no data for the range', () => {
    render(<ReportsPage />);

    expect(screen.getByText('No data for this range.')).toBeInTheDocument();
  });
});
