import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'info' | 'warning' | 'destructive' | 'neutral';
export type ServiceStatus = 'open' | 'in-service' | 'waiting' | 'needs-you' | 'reservation';

const STATUS_TONE: Record<ServiceStatus, Tone> = {
  open: 'success',
  'in-service': 'info',
  waiting: 'warning',
  'needs-you': 'destructive',
  reservation: 'info',
};

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  open: 'Open',
  'in-service': 'In service',
  waiting: 'Waiting',
  'needs-you': 'Needs you',
  reservation: 'Reservation',
};

function resolveTone(tone?: Tone, status?: ServiceStatus): Tone {
  if (tone) return tone;
  if (status) return STATUS_TONE[status];

  return 'neutral';
}

const dotVariants = cva('inline-block rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      info: 'bg-info',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
      neutral: 'bg-muted-foreground',
    },
    size: { sm: 'size-2', md: 'size-2.5' },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
});

export function StatusDot({
  status,
  tone,
  size = 'sm',
  className,
}: {
  status?: ServiceStatus;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(dotVariants({ tone: resolveTone(tone, status), size }), className)}
    />
  );
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        success: 'bg-success/12 text-success',
        info: 'bg-info/12 text-info',
        warning: 'bg-warning/15 text-warning',
        destructive: 'bg-destructive/12 text-destructive',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function StatusBadge({
  status,
  tone,
  label,
  showDot = false,
  className,
}: {
  status?: ServiceStatus;
  tone?: Tone;
  label?: string;
  showDot?: boolean;
  className?: string;
}) {
  const resolved = resolveTone(tone, status);
  const text = label ?? (status ? STATUS_LABELS[status] : '');

  return (
    <span className={cn(badgeVariants({ tone: resolved }), className)}>
      {showDot && <StatusDot tone={resolved} />}
      {text}
    </span>
  );
}
