import { createFileRoute } from '@tanstack/react-router';
import { LayoutGrid, ShoppingCart, CalendarCheck, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableControllerGetAll } from '@/api/tables/tables';
import { useOrderControllerGetAll } from '@/api/orders/orders';
import { useReservationControllerGetAll } from '@/api/reservations/reservations';
import { useMenuControllerGetItems } from '@/api/menu/menu';
import type {
  TableDto,
  OrderDto,
  ReservationDto,
  MenuItemDto,
} from '@/api/restaurantManagerAPI.schemas';

export const Route = createFileRoute('/_app/service/')({
  component: DashboardPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function tableStatusClasses(status: string): string {
  if (status === 'available') return 'bg-success/10 text-success';
  if (status === 'occupied') return 'bg-info/10 text-info';

  return 'bg-warning/10 text-warning-foreground';
}

function orderStatusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

function orderStatusClasses(status: string): string {
  if (status === 'served') return 'bg-success/10 text-success';
  if (status === 'in_progress' || status === 'ready')
    return 'bg-warning/10 text-warning-foreground';

  if (status === 'sent') return 'bg-accent/10 text-accent';

  return 'bg-muted text-muted-foreground';
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  detail: React.ReactNode;
  loading: boolean;
}

function StatCard({ icon, label, value, detail, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface RecentOrderRowProps {
  order: OrderDto;
  tableNumber: number | undefined;
}

function RecentOrderRow({ order, tableNumber }: RecentOrderRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {tableNumber !== undefined ? `Table ${tableNumber}` : 'Unknown'}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${orderStatusClasses(order.status)}`}
        >
          {orderStatusLabel(order.status)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

interface TableDotProps {
  table: TableDto;
}

function TableDot({ table }: TableDotProps) {
  return (
    <div
      title={`Table ${table.number} — ${table.status}`}
      className={`flex flex-col items-center justify-center rounded-lg p-2 gap-0.5 ${tableStatusClasses(table.status)}`}
    >
      <span className="text-xs font-bold leading-none">{table.number}</span>
      <span className="text-[10px] leading-none capitalize hidden sm:block">
        {table.status.slice(0, 3)}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function DashboardPage() {
  const { data: tables = [], isLoading: tablesLoading } = useTableControllerGetAll<TableDto[]>();
  const { data: orders = [], isLoading: ordersLoading } = useOrderControllerGetAll<OrderDto[]>();
  const { data: reservations = [], isLoading: reservationsLoading } =
    useReservationControllerGetAll<ReservationDto[]>();
  const { data: menuItems = [], isLoading: menuLoading } =
    useMenuControllerGetItems<MenuItemDto[]>();

  // Derived stats
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const inProgressCount = todayOrders.filter(
    (o) => o.status === 'in_progress' || o.status === 'sent' || o.status === 'ready',
  ).length;

  const upcomingReservations = reservations.filter((r) => new Date(r.date) >= new Date()).length;

  const activeMenuItems = menuItems.filter((m) => m.available).length;

  // Table lookup by id
  const tableById = new Map(tables.map((t) => [t.id, t]));

  // Recent orders: last 5 by createdAt descending
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Live overview of your restaurant.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<LayoutGrid size={18} />}
          label="Tables"
          value={tables.length}
          loading={tablesLoading}
          detail={
            <span className="flex flex-wrap gap-2">
              <span className="text-success">{availableCount} avail</span>
              <span className="text-info">{occupiedCount} occ</span>
              <span className="text-warning-foreground">{reservedCount} res</span>
            </span>
          }
        />
        <StatCard
          icon={<ShoppingCart size={18} />}
          label="Orders Today"
          value={todayOrders.length}
          loading={ordersLoading}
          detail={<span>{inProgressCount} in progress</span>}
        />
        <StatCard
          icon={<CalendarCheck size={18} />}
          label="Reservations"
          value={upcomingReservations}
          loading={reservationsLoading}
          detail={<span>upcoming</span>}
        />
        <StatCard
          icon={<UtensilsCrossed size={18} />}
          label="Menu Items"
          value={activeMenuItems}
          loading={menuLoading}
          detail={<span>{menuItems.length} total items</span>}
        />
      </div>

      {/* Quick-action panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading || tablesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder — no stable id
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            ) : (
              <div>
                {recentOrders.map((order) => (
                  <RecentOrderRow
                    key={order.id}
                    order={order}
                    tableNumber={tableById.get(order.tableId)?.number}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Table Status</CardTitle>
          </CardHeader>
          <CardContent>
            {tablesLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder — no stable id
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tables configured.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {tables.map((table) => (
                    <TableDot key={table.id} table={table} />
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-info inline-block" />
                    Occupied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                    Reserved
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
