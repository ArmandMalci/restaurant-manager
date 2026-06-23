import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportsControllerGetSummary } from '@/api/reports/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsPage,
});

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  in_progress: 'In Progress',
  ready: 'Ready',
  served: 'Served',
};

const ORDER_STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-accent/10 text-accent-foreground',
  in_progress: 'bg-warning/10 text-warning-foreground',
  ready: 'bg-success/10 text-success-foreground',
  served: 'bg-secondary text-secondary-foreground',
};

const TABLE_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  occupied: 'bg-info',
  reserved: 'bg-warning',
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="space-y-1">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ReportsPage() {
  const { data, isLoading, refetch, isFetching } = useReportsControllerGetSummary();

  const totalOrders = data ? Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0) : 0;
  const totalTables = data ? Object.values(data.tablesByStatus).reduce((a, b) => a + b, 0) : 0;
  const occupiedTables = data?.tablesByStatus.occupied ?? 0;
  const occupiedPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="hover:bg-accent flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : !data ? (
          <p className="text-muted-foreground col-span-4 text-sm">No data available.</p>
        ) : (
          <>
            <StatCard label="Total Orders" value={totalOrders} />
            <StatCard
              label="Tables Occupied"
              value={`${occupiedPct}%`}
              sub={`${occupiedTables} of ${totalTables} tables`}
            />
            <StatCard label="Reservations Today" value={data.reservationsToday} />
            <StatCard
              label="Top Item"
              value={data.topItems[0]?.totalQuantity ?? 0}
              sub={data.topItems[0]?.name ?? '—'}
            />
          </>
        )}
      </div>

      {/* Order Status breakdown */}
      <section className="space-y-3">
        <h2 className="font-semibold">Order Status</h2>
        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-24 rounded-lg" />
            ))}
          </div>
        ) : !data || Object.keys(data.ordersByStatus).length === 0 ? (
          <p className="text-muted-foreground text-sm">No orders yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.ordersByStatus).map(([status, count]) => (
              <div
                key={status}
                className={cn(
                  'min-w-24 rounded-lg px-4 py-3 text-center',
                  ORDER_STATUS_CLASSES[status] ?? 'bg-muted text-muted-foreground',
                )}
              >
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs">{ORDER_STATUS_LABELS[status] ?? status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Table Status overview */}
      <section className="space-y-3">
        <h2 className="font-semibold">Table Status</h2>
        {isLoading ? (
          <div className="flex flex-wrap gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-lg" />
            ))}
          </div>
        ) : !data || Object.keys(data.tablesByStatus).length === 0 ? (
          <p className="text-muted-foreground text-sm">No tables yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.tablesByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 rounded-lg border px-4 py-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    TABLE_DOT_CLASSES[status] ?? 'bg-muted-foreground',
                  )}
                />
                <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                <span className="text-lg font-bold">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top ordered items */}
      <section className="space-y-3">
        <h2 className="font-semibold">Top Ordered Items</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : !data || data.topItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No order data yet.</p>
        ) : (
          <div className="space-y-2">
            {data.topItems.map((item, i) => {
              const maxQty = data.topItems[0].totalQuantity;
              const pct = maxQty > 0 ? Math.round((item.totalQuantity / maxQty) * 100) : 0;

              return (
                <div key={item.menuItemId} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-4 font-mono text-sm">{i + 1}</span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.totalQuantity} served</span>
                    </div>
                    <div className="bg-muted h-1.5 w-full rounded-full">
                      <div
                        className="bg-chart-1 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
