import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarPage } from './index';

const mockReservations = vi.fn();
const mockShifts = vi.fn();
const mockStaff = vi.fn();

vi.mock('@/api/reservations/reservations', () => ({
  useReservationControllerGetAll: () => mockReservations(),
}));
vi.mock('@/api/shifts/shifts', () => ({
  useShiftControllerGetAll: () => mockShifts(),
}));
vi.mock('@/api/staff/staff', () => ({
  useStaffControllerGetAll: () => mockStaff(),
}));

beforeEach(() => {
  mockReservations.mockReturnValue({ data: [] });
  mockShifts.mockReturnValue({ data: [] });
  mockStaff.mockReturnValue({ data: [] });
  // jsdom doesn't implement matchMedia; useIsMobile() needs it to resolve to desktop.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

function clickTodayCell(container: HTMLElement) {
  const link = container.querySelector<HTMLButtonElement>('.rbc-now .rbc-button-link');

  if (!link) throw new Error("today's date cell not found");
  fireEvent.click(link);
}

describe('CalendarPage', () => {
  it('defaults to Month view on the Reservations tab', () => {
    const { container } = render(<CalendarPage />);

    expect(container.querySelector('.rbc-month-view')).toBeInTheDocument();
  });

  it('opens the day-detail modal with that day’s reservations on day click', async () => {
    const today = new Date();
    const elsewhere = new Date(today);

    elsewhere.setDate(
      elsewhere.getDate() - 15 < 1 ? elsewhere.getDate() + 15 : elsewhere.getDate() - 15,
    );

    mockReservations.mockReturnValue({
      data: [
        {
          id: '1',
          guestName: 'Ada Lovelace',
          partySize: 2,
          date: today.toISOString(),
          tableId: 't1',
        },
        {
          id: '2',
          guestName: 'Grace Hopper',
          partySize: 4,
          date: elsewhere.toISOString(),
          tableId: 't2',
        },
      ],
    });

    const { container } = render(<CalendarPage />);

    clickTodayCell(container);

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
    expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();
  });

  it('shows an empty state for a day with zero reservations', async () => {
    const { container } = render(<CalendarPage />);

    clickTodayCell(container);

    await waitFor(() => expect(screen.getByText('No reservations')).toBeInTheDocument());
  });

  it('switches to the Shifts tab (Week view) without crashing, and back to Month', () => {
    const { container } = render(<CalendarPage />);

    expect(container.querySelector('.rbc-month-view')).toBeInTheDocument();

    fireEvent.click(screen.getByText('shifts'));
    expect(container.querySelector('.rbc-time-view')).toBeInTheDocument();

    fireEvent.click(screen.getByText('reservations'));
    expect(container.querySelector('.rbc-month-view')).toBeInTheDocument();
  });
});
