import { Link } from '@tanstack/react-router';
import { UtensilsCrossed, MoreVertical } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from './nav';

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-full w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="bg-accent text-accent-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <span className="text-sidebar-foreground text-sm font-semibold tracking-tight">
          RestoManager
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="text-sidebar-foreground/45 px-3 pb-1 text-[11px] font-medium uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  '[&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground [&.active]:font-semibold',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-sidebar-border flex items-center gap-3 border-t px-4 py-4">
          <div className="bg-sidebar-accent text-sidebar-accent-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {getInitials(user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground truncate text-xs font-medium">{user.email}</p>
            <p className="text-sidebar-foreground/50 text-xs">Manager</p>
          </div>
          <button
            type="button"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground rounded p-1 transition-colors"
            aria-label="User options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
