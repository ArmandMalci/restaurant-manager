import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function ListRow({ leading, title, subtitle, meta, action, className }: ListRowProps) {
  return (
    <div
      className={cn(
        'border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0',
        className,
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="text-muted-foreground truncate text-xs">{subtitle}</div>}
      </div>
      {meta && (
        <div className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">{meta}</div>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
