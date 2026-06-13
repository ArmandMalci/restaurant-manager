import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Table2,
  UtensilsCrossed,
  ShoppingCart,
  CalendarDays,
  Users,
  BarChart3,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tables', label: 'Tables', icon: Table2 },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
] as const

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background px-3 py-4">
      <div className="mb-6 px-3">
        <span className="text-lg font-semibold tracking-tight">Restaurant</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              '[&.active]:bg-accent [&.active]:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
