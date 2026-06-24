import { BellOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function NotificationFeed() {
  return (
    <div className="px-4 py-6">
      <EmptyState
        icon={BellOff}
        title="No new alerts"
        description="Order-ready, table-waiting, and reservation alerts will appear here during service."
      />
    </div>
  );
}
