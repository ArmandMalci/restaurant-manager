import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CircleCheck } from 'lucide-react';
import { useServiceControllerGetSnapshot } from '@/api/service/service';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCell } from '@/components/ui/metric-cell';
import { ListRow } from '@/components/ui/list-row';
import { StatusDot } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export const Route = createFileRoute('/_app/service/')({
  component: ServicePage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMins(m: number): string {
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;

  return `${m}m`;
}

function statusToTone(status: string): Tone {
  if (status === 'available') return 'success';
  if (status === 'occupied') return 'info';
  if (status === 'reserved') return 'warning';

  return 'neutral';
}

function asTone(s: string): Tone {
  if (s === 'success' || s === 'info' || s === 'warning' || s === 'destructive') return s;

  return 'neutral';
}

function formatAge(ageMin: number): string {
  if (ageMin > 0) return formatMins(ageMin);
  if (ageMin < 0) return `in ${formatMins(-ageMin)}`;

  return 'now';
}

function liveDateLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `${weekday} · ${time}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PulseSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder — no stable id
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

function AttentionSkeletons() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder — no stable id
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ServicePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useServiceControllerGetSnapshot({
    query: { refetchInterval: 12_000 },
  });

  const pulse = data?.pulse;
  const attention = data?.attention ?? [];
  const floor = data?.floor ?? [];

  function handleAttentionAction(type: string) {
    switch (type) {
      case 'order-ready':
        void navigate({ to: '/order' });
        break;
      case 'table-waiting':
        void navigate({ to: '/floor' });
        break;
      case 'reservation-due':
        void navigate({ to: '/reservations' });
        break;
      case 'low-stock':
        void navigate({ to: '/inventory' });
        break;
      default:
        break;
    }
  }

  function actionLabel(type: string): string {
    switch (type) {
      case 'order-ready':
        return 'Run';
      case 'table-waiting':
        return 'Take order';
      case 'reservation-due':
        return 'Seat';
      case 'low-stock':
        return 'View';
      default:
        return 'Go';
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Service" subtitle={liveDateLabel()} />

      {/* Pulse strip */}
      {isLoading ? (
        <PulseSkeletons />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCell
            label="Covers seated"
            value={`${pulse?.coversSeated ?? 0} / ${pulse?.capacity ?? 0}`}
          />
          <MetricCell
            label="Tables occupied"
            value={`${pulse?.tablesOccupied ?? 0} / ${pulse?.tablesTotal ?? 0}`}
          />
          <MetricCell
            label="Avg turn"
            value={pulse?.avgTurnMin == null ? '—' : formatMins(pulse.avgTurnMin)}
          />
          <MetricCell
            label="Kitchen load"
            value={String(pulse?.kitchen.ticketCount ?? 0)}
            sub={`${formatMins(pulse?.kitchen.oldestMin ?? 0)} oldest`}
          />
        </div>
      )}

      {/* Needs attention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Needs attention</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 py-3">
              <AttentionSkeletons />
            </div>
          ) : attention.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="All clear"
              description="No alerts right now."
              className="border-0"
            />
          ) : (
            attention.map((a) => (
              <ListRow
                key={a.id}
                leading={<StatusDot tone={asTone(a.tone)} size="md" />}
                title={a.title}
                subtitle={a.subtitle}
                meta={formatAge(a.ageMin)}
                action={
                  <button
                    type="button"
                    onClick={() => handleAttentionAction(a.type)}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {actionLabel(a.type)}
                  </button>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Floor mini-grid */}
      {!isLoading && floor.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
            Floor
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {floor.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                render={<Link to="/floor" />}
                title={`Table ${t.number} — ${t.status}${t.ageMin != null ? ` (${t.ageMin}m)` : ''}`}
                className="h-auto min-h-11 justify-start gap-1.5 bg-card px-2 py-1.5 font-normal"
              >
                <StatusDot tone={statusToTone(t.status)} size="sm" />
                <span className="text-foreground text-xs font-medium">T{t.number}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
