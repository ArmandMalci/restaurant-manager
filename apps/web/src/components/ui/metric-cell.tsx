import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCellProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}

export function MetricCell({ label, value, sub, className }: MetricCellProps) {
  return (
    <div className={cn('bg-card border-border rounded-lg border p-3', className)}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-foreground mt-1 font-serif text-2xl leading-none">{value}</p>
      {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
    </div>
  );
}
