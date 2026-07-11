import { useState } from 'react';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { Menu, Bell, LogOut, UtensilsCrossed } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth.store';
import { authControllerLogout } from '@/api/auth/auth';
import { NAV_GROUPS } from './nav';
import { NotificationFeed } from '@/components/notification-feed';

const ROUTE_LABELS: Record<string, string> = {
  '/service': 'Service',
  '/floor': 'Floor',
  '/order': 'Order',
  '/reservations': 'Reservations',
  '/checkout': 'Checkout',
  '/menu': 'Menu',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
};

function usePageTitle(): string {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  const segment = pathname.split('/').filter(Boolean).pop() ?? '';

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Topbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const title = usePageTitle();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    try {
      await authControllerLogout();
    } finally {
      clearAuth();
      router.navigate({ to: '/login' });
    }
  }

  return (
    <header className="bg-card border-border flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors md:hidden"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-border border-b px-4 py-4">
              <SheetTitle className="flex items-center gap-3 text-sm font-semibold">
                <span className="bg-accent text-accent-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                RestoManager
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 overflow-y-auto px-3 py-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="flex flex-col gap-0.5">
                  <p className="text-muted-foreground px-3 pb-1 text-[11px] font-medium uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-foreground/70 hover:bg-muted hover:text-foreground [&.active]:bg-accent/10 [&.active]:text-accent flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      </div>

      <div className="flex items-center gap-1">
        <Sheet>
          <SheetTrigger
            render={
              <button
                type="button"
                className="text-muted-foreground hover:bg-accent/10 hover:text-foreground rounded-md p-2 transition-colors"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetHeader className="border-border border-b px-4 py-4">
              <SheetTitle className="text-sm font-semibold">Notifications</SheetTitle>
            </SheetHeader>
            <NotificationFeed />
          </SheetContent>
        </Sheet>
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
