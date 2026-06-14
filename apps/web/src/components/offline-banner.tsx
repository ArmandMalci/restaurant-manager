import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 border-b border-yellow-200"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      You're offline — changes will be queued and sent when reconnected.
    </div>
  );
}
