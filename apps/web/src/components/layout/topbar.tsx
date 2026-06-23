import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import {
  LogOut,
  Bell,
  Menu,
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authControllerLogout } from '@/api/auth/auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const MOBILE_NAV = [
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await authControllerLogout();
    } finally {
      clearAuth();
      router.navigate({ to: '/login' });
    }
  }

  return (
    <header className="bg-card border-b border-border flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className="md:hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-border px-4 py-4">
              <SheetTitle className="flex items-center gap-3 text-sm font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                RestoManager
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-0.5 overflow-y-auto px-3 py-3">
              {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-accent/10 [&.active]:text-accent"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <h1 className="text-foreground text-sm font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-1">
        <Link
          to="/notifications"
          className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>
        <span className="text-muted-foreground hidden px-2 text-sm sm:inline">{user?.email}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
