import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Utensils, AlertTriangle, Calendar, ChefHat, Users, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_app/notifications/')({
  component: NotificationsPage,
});

type NotificationIcon = 'table' | 'warning' | 'calendar' | 'order' | 'staff';

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  icon: NotificationIcon;
  group: 'today' | 'week' | 'older';
}

const ICON_MAP: Record<NotificationIcon, React.ReactNode> = {
  table: <Utensils className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  order: <ChefHat className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />,
};

const ICON_COLOR_MAP: Record<NotificationIcon, string> = {
  table: 'bg-accent/15 text-accent-foreground',
  warning: 'bg-warning/15 text-warning-foreground',
  calendar: 'bg-primary/10 text-primary',
  order: 'bg-success/15 text-success-foreground',
  staff: 'bg-muted text-muted-foreground',
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Table 4 seated',
    desc: 'Party of 3 checked in',
    time: '2 min ago',
    read: false,
    icon: 'table',
    group: 'today',
  },
  {
    id: '2',
    title: 'Low inventory alert',
    desc: 'Olive oil below minimum stock',
    time: '15 min ago',
    read: false,
    icon: 'warning',
    group: 'today',
  },
  {
    id: '3',
    title: 'New reservation',
    desc: 'John Smith — tonight 8pm, party of 4',
    time: '1 hour ago',
    read: true,
    icon: 'calendar',
    group: 'today',
  },
  {
    id: '4',
    title: 'Order #47 ready',
    desc: 'Kitchen marked order ready for table 7',
    time: '2 hours ago',
    read: true,
    icon: 'order',
    group: 'week',
  },
  {
    id: '5',
    title: 'Staff check-in',
    desc: 'Maria Garcia clocked in',
    time: 'Yesterday',
    read: true,
    icon: 'staff',
    group: 'older',
  },
];

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const { id, title, desc, time, read, icon } = notification;

  return (
    <button
      type="button"
      onClick={() => !read && onRead(id)}
      onKeyDown={(e) => e.key === 'Enter' && !read && onRead(id)}
      className="relative flex w-full cursor-pointer gap-4 overflow-hidden rounded-lg border border-border bg-card p-4 text-left transition-shadow hover:shadow-sm"
    >
      {/* Unread left stripe */}
      {!read && <div className="absolute bottom-0 left-0 top-0 w-1 bg-accent" aria-hidden="true" />}

      {/* Icon */}
      <div
        className={[
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          ICON_COLOR_MAP[icon],
        ].join(' ')}
        aria-hidden="true"
      >
        {ICON_MAP[icon]}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={[
              'text-sm',
              read ? 'font-normal text-foreground' : 'font-semibold text-foreground',
            ].join(' ')}
          >
            {title}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
      </div>

      {/* Unread dot */}
      {!read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      )}
    </button>
  );
}

function NotificationGroup({
  label,
  notifications,
  onRead,
}: {
  label: string;
  notifications: Notification[];
  onRead: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
        {label}
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {unreadCount} New
          </span>
        )}
      </h3>
      <div className="space-y-3">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={onRead} />
        ))}
      </div>
    </div>
  );
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const today = notifications.filter((n) => n.group === 'today');
  const thisWeek = notifications.filter((n) => n.group === 'week');
  const older = notifications.filter((n) => n.group === 'older');

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification groups */}
      <div className="space-y-6">
        <NotificationGroup label="Today" notifications={today} onRead={markRead} />
        <NotificationGroup label="This Week" notifications={thisWeek} onRead={markRead} />
        <NotificationGroup label="Older" notifications={older} onRead={markRead} />

        {notifications.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
