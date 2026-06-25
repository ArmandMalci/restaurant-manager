import { BellOff } from 'lucide-react';
import { useServiceControllerGetSnapshot } from '@/api/service/service';
import { ListRow } from '@/components/ui/list-row';
import { StatusDot } from '@/components/ui/status';
import type { Tone } from '@/components/ui/status';
import { EmptyState } from '@/components/ui/empty-state';

function asTone(s: string): Tone {
  if (s === 'success' || s === 'info' || s === 'warning' || s === 'destructive') return s;

  return 'neutral';
}

function formatAge(ageMin: number): string {
  if (ageMin > 0) return `${ageMin}m`;
  if (ageMin < 0) return `in ${-ageMin}m`;

  return 'now';
}

export function NotificationFeed() {
  const { data } = useServiceControllerGetSnapshot({
    query: { refetchInterval: 12_000 },
  });

  const attention = data?.attention ?? [];

  return (
    <div>
      <p className="text-muted-foreground px-4 pb-2 pt-3 text-xs font-medium">
        Notifications ({attention.length})
      </p>
      {attention.length === 0 ? (
        <div className="px-4 pb-6">
          <EmptyState
            icon={BellOff}
            title="No new alerts"
            description="Order-ready, table-waiting, and reservation alerts will appear here during service."
          />
        </div>
      ) : (
        attention.map((a) => (
          <ListRow
            key={a.id}
            leading={<StatusDot tone={asTone(a.tone)} size="md" />}
            title={a.title}
            subtitle={a.subtitle}
            meta={formatAge(a.ageMin)}
          />
        ))
      )}
    </div>
  );
}
