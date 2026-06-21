import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authControllerLogout } from '@/api/auth/auth';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tables': 'Tables',
  '/menu': 'Menu',
  '/orders': 'Orders',
  '/reservations': 'Reservations',
  '/calendar': 'Calendar',
  '/staff': 'Staff',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
};

function usePageTitle(): string {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Topbar() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const pageTitle = usePageTitle();

  async function handleLogout() {
    try {
      await authControllerLogout();
    } finally {
      clearAuth();
      router.navigate({ to: '/login' });
    }
  }

  return (
    <header className="bg-card border-b border-border flex h-14 shrink-0 items-center justify-between px-6">
      <h1 className="text-foreground text-sm font-semibold">{pageTitle}</h1>
      <div className="flex items-center gap-1">
        <Link
          to="/notifications"
          className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>
        {user && <span className="text-muted-foreground px-2 text-sm">{user.email}</span>}
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
