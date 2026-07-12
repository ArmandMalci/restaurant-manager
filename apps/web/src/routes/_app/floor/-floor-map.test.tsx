import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { STATUS_BG, FloorMap } from './-floor-map';
import type { TableDto, ReservationDto } from '@/api/restaurantManagerAPI.schemas';

describe('floor tile status colors', () => {
  it('uses semantic tokens, never literal palette or .dark', () => {
    for (const cls of Object.values(STATUS_BG)) {
      expect(cls).not.toMatch(/emerald|sky|amber|slate|zinc|gray/);
      expect(cls).not.toMatch(/\bdark:/);
      expect(cls).toMatch(/success|info|warning/);
    }
  });
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const reservedTable: TableDto = {
  id: 't1',
  number: 5,
  name: null,
  seats: 2,
  status: 'reserved',
  posX: 50,
  posY: 50,
  shape: 'square',
  sectionId: 's1',
  createdAt: '',
  updatedAt: '',
};

const reservation: ReservationDto = {
  id: 'r1',
  tableId: 't1',
  guestName: 'Ada Lovelace',
  guestPhone: null,
  guestEmail: null,
  partySize: 4,
  date: new Date().toISOString(),
  notes: null,
  status: 'booked',
  createdAt: '',
  updatedAt: '',
};

describe('FloorMap reservation context (Plan 15 Task 3)', () => {
  it('shows the guest name on a reserved tile with a matching reservation', () => {
    render(
      <FloorMap
        tables={[reservedTable]}
        onTableClick={() => {}}
        reservationByTable={new Map([['t1', reservation]])}
      />,
      { wrapper },
    );

    expect(screen.getByText(/Ada ·/)).toBeInTheDocument();
  });

  it('falls back to the seat count when there is no matching reservation', () => {
    render(<FloorMap tables={[reservedTable]} onTableClick={() => {}} />, { wrapper });

    expect(screen.queryByText(/Ada/)).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
