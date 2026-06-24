import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning/15 text-warning border-warning/30 flex items-center gap-2 border-b px-4 py-2 text-sm font-medium"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      You're offline — changes will be queued and sent when reconnected.
    </div>
  );
}
