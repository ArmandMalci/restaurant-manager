import {
  Activity,
  LayoutGrid,
  ClipboardList,
  DoorOpen,
  Receipt,
  ChefHat,
  UtensilsCrossed,
  Package,
  BarChart3,
  CalendarRange,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Service',
    items: [
      { to: '/service', label: 'Service', icon: Activity },
      { to: '/floor', label: 'Floor', icon: LayoutGrid },
      { to: '/order', label: 'Order', icon: ClipboardList },
      { to: '/reservations', label: 'Reservations', icon: DoorOpen },
      { to: '/checkout', label: 'Checkout', icon: Receipt },
    ],
  },
  {
    label: 'Kitchen',
    items: [{ to: '/kds', label: 'KDS', icon: ChefHat }],
  },
  {
    label: 'Back office',
    items: [
      { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
      { to: '/inventory', label: 'Inventory', icon: Package },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/calendar', label: 'Calendar', icon: CalendarRange },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];
