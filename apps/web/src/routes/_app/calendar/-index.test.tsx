import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('CalendarPage', () => {
  it('defaults to Month view on the Reservations tab', () => {
    const { container } = render(<CalendarPage />);

    expect(container.querySelector('.rbc-month-view')).toBeInTheDocument();
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
