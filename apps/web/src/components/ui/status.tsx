import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type ServiceStatus = 'open' | 'in-service' | 'waiting' | 'needs-you' | 'reservation';

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  open: 'Open',
  'in-service': 'In service',
  waiting: 'Waiting',
  'needs-you': 'Needs you',
  reservation: 'Reservation',
};

const dotVariants = cva('inline-block rounded-full', {
  variants: {
    status: {
      open: 'bg-success',
      'in-service': 'bg-info',
      waiting: 'bg-warning',
      'needs-you': 'bg-destructive',
      reservation: 'bg-info',
    },
    size: { sm: 'size-2', md: 'size-2.5' },
  },
  defaultVariants: { status: 'open', size: 'sm' },
});

export function StatusDot({
  status,
  size = 'sm',
  className,
}: {
  status: ServiceStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return <span aria-hidden="true" className={cn(dotVariants({ status, size }), className)} />;
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        open: 'bg-success/12 text-success',
        'in-service': 'bg-info/12 text-info',
        waiting: 'bg-warning/15 text-warning',
        'needs-you': 'bg-destructive/12 text-destructive',
        reservation: 'bg-info/12 text-info',
      },
    },
    defaultVariants: { status: 'open' },
  },
);

export function StatusBadge({
  status,
  label,
  showDot = false,
  className,
}: {
  status: ServiceStatus;
  label?: string;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {showDot && <StatusDot status={status} />}
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
