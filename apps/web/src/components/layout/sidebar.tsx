import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Table2,
  UtensilsCrossed,
  ShoppingCart,
  CalendarDays,
  CalendarRange,
  Users,
  BarChart3,
  Package,
  Settings,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tables', label: 'Tables', icon: Table2 },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/calendar', label: 'Calendar', icon: CalendarRange },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

function getInitials(email: string): string {
  return email.charAt(0).toUpperCase();
}

export function Sidebar() {
  const { user } = useAuthStore();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="bg-accent text-accent-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
          RestoManager
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'border-l-2 border-transparent text-sidebar-foreground/60',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              '[&.active]:border-sidebar-primary [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User profile */}
      {user && (
        <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
          <div className="bg-sidebar-accent text-sidebar-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {getInitials(user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/50">Manager</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
            aria-label="User options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
