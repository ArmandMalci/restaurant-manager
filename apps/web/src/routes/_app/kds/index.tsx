import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Check } from 'lucide-react';
import { useKdsControllerGetTickets, invalidateKdsControllerGetTickets } from '@/api/kds/kds';
import { useOrderControllerUpdateItemStatus } from '@/api/orders/orders';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/kds/')({
  component: KdsPage,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const AGE_DESTRUCTIVE_MIN = 10;
const AGE_WARNING_MIN = 5;

type Station = 'all' | 'grill' | 'cold' | 'bar' | 'pass';

const STATIONS: { value: Station; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'grill', label: 'Grill' },
  { value: 'cold', label: 'Cold' },
  { value: 'bar', label: 'Bar' },
  { value: 'pass', label: 'Pass' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAgeMin(firedAt: string | null): number | null {
  if (!firedAt) return null;
  return Math.round((Date.now() - new Date(firedAt).getTime()) / 60_000);
}

function ageLabel(ageMin: number | null): string {
  if (ageMin === null) return 'just now';
  if (ageMin <= 0) return 'just now';
  return `${ageMin}m`;
}

function ageTone(ageMin: number | null): Tone {
  if (ageMin === null) return 'neutral';
  if (ageMin > AGE_DESTRUCTIVE_MIN) return 'destructive';
  if (ageMin > AGE_WARNING_MIN) return 'warning';
  return 'success';
}

function ageBorderClass(ageMin: number | null): string {
  if (ageMin === null) return 'border-border';
  if (ageMin > AGE_DESTRUCTIVE_MIN) return 'border-destructive/60';
  if (ageMin > AGE_WARNING_MIN) return 'border-warning/60';
  return 'border-border';
}

type KitchenStation = 'grill' | 'cold' | 'bar' | 'pass';

function effectiveStation(station: string | null): KitchenStation {
  if (station === 'grill' || station === 'cold' || station === 'bar' || station === 'pass') {
    return station;
  }
  return 'pass';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TicketSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder — no stable id
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  );
}

interface KdsTicketItem {
  id: string;
  name: string;
  quantity: number;
  station: string | null;
  status: string;
  modifiers: string[];
}

interface KdsTicket {
  orderId: string;
  tableNumber: number | null;
  firedAt: string | null;
  items: KdsTicketItem[];
}

interface TicketCardProps {
  ticket: KdsTicket;
  activeStation: Station;
  onBump: (orderId: string, itemId: string) => void;
  bumpingKeys: Set<string>;
}

function TicketCard({ ticket, activeStation, onBump, bumpingKeys }: TicketCardProps) {
  const ageMin = calcAgeMin(ticket.firedAt);
  const tone = ageTone(ageMin);
  const borderClass = ageBorderClass(ageMin);

  return (
    <Card className={cn('flex flex-col border-2', borderClass)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-bold">
          {ticket.tableNumber != null ? `Table ${ticket.tableNumber}` : 'Table —'}
        </CardTitle>
        <StatusBadge tone={tone} label={ageLabel(ageMin)} />
      </CardHeader>
      <CardContent className="flex flex-col gap-1 pt-0">
        {ticket.items.map((item) => {
          const itemStation = effectiveStation(item.station);
          const isReady = item.status === 'ready';
          const stationMatch = activeStation === 'all' || itemStation === activeStation;
          const dimmed = !stationMatch;

          if (isReady) {
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 opacity-40"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-base font-medium line-through text-muted-foreground">
                    {item.quantity}× {item.name}
                  </p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.modifiers.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (dimmed) {
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 opacity-50"
                aria-hidden="true"
              >
                <div className="min-w-0">
                  <p className="text-base font-medium">
                    {item.quantity}× {item.name}
                  </p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.modifiers.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          const isItemBumping = bumpingKeys.has(`${ticket.orderId}:${item.id}`);

          return (
            <button
              key={item.id}
              type="button"
              disabled={isItemBumping}
              onClick={() => onBump(ticket.orderId, item.id)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted active:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {item.quantity}× {item.name}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {item.modifiers.join(', ')}
                  </p>
                )}
              </div>
              <span className="mt-0.5 shrink-0 rounded border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                Ready
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function KdsPage() {
  const qc = useQueryClient();
  const [activeStation, setActiveStation] = useState<Station>('all');
  const [bumpingKeys, setBumpingKeys] = useState<Set<string>>(new Set());

  const { data: tickets, isLoading } = useKdsControllerGetTickets({
    query: { refetchInterval: 6_000 },
  });

  const updateItemStatus = useOrderControllerUpdateItemStatus({
    mutation: {
      onSuccess: () => {
        void invalidateKdsControllerGetTickets(qc);
      },
    },
  });

  function handleBump(orderId: string, itemId: string) {
    const key = `${orderId}:${itemId}`;
    setBumpingKeys((prev) => new Set(prev).add(key));
    updateItemStatus.mutate(
      { id: orderId, itemId, data: { status: 'ready' } },
      {
        onSettled: () => {
          setBumpingKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        },
      },
    );
  }

  const allTickets = tickets ?? [];

  const visibleTickets =
    activeStation === 'all'
      ? allTickets
      : allTickets.filter((t) =>
          t.items.some((it) => effectiveStation(it.station) === activeStation),
        );

  return (
    <div className="space-y-5 p-1">
      <PageHeader title="Kitchen Display" subtitle="Active tickets" />

      {/* Station filter */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Station filter">
        {STATIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setActiveStation(s.value)}
            className={cn(
              'rounded-md border px-4 py-1.5 text-sm font-medium transition-colors',
              activeStation === s.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Board */}
      {isLoading ? (
        <TicketSkeletons />
      ) : visibleTickets.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Kitchen's clear"
          description="No active tickets."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.orderId}
              ticket={ticket}
              activeStation={activeStation}
              onBump={handleBump}
              bumpingKeys={bumpingKeys}
            />
          ))}
        </div>
      )}
    </div>
  );
}
