import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportsControllerGetSummary } from '@/api/reports/reports';

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
const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  served: 'bg-purple-100 text-purple-700',
};
const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
};

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="space-y-1 rounded-lg border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </div>
  );
}

function ReportsPage() {
  const { data, isLoading, refetch, isFetching } = useReportsControllerGetSummary();

  const totalOrders = data ? Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0) : 0;
  const totalTables = data ? Object.values(data.tablesByStatus).reduce((a, b) => a + b, 0) : 0;
  const occupiedTables = data?.tablesByStatus.occupied ?? 0;

  return (
    <div className="space-y-8 p-6">
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

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading summary…</p>
      ) : !data ? (
        <p className="text-muted-foreground text-sm">No data available.</p>
      ) : (
        <div className="space-y-8">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total orders" value={totalOrders} />
            <StatCard
              label="Tables occupied"
              value={`${occupiedTables} / ${totalTables}`}
              sub="currently occupied"
            />
            <StatCard label="Reservations today" value={data.reservationsToday} />
            <StatCard
              label="Active order items"
              value={data.topItems.length > 0 ? data.topItems[0].totalQuantity : 0}
              sub={data.topItems[0]?.name ?? '—'}
            />
          </div>

          {/* Orders by status */}
          <section className="space-y-3">
            <h2 className="font-semibold">Orders by status</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className={cn(
                    'min-w-24 rounded-lg px-4 py-2 text-center',
                    ORDER_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700',
                  )}
                >
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs">{ORDER_STATUS_LABELS[status] ?? status}</p>
                </div>
              ))}
              {Object.keys(data.ordersByStatus).length === 0 && (
                <p className="text-muted-foreground text-sm">No orders yet.</p>
              )}
            </div>
          </section>

          {/* Tables by status */}
          <section className="space-y-3">
            <h2 className="font-semibold">Tables by status</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.tablesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-lg border px-4 py-2">
                  <span
                    className={cn(
                      'h-3 w-3 rounded-full',
                      TABLE_STATUS_COLORS[status] ?? 'bg-gray-400',
                    )}
                  />
                  <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
              {Object.keys(data.tablesByStatus).length === 0 && (
                <p className="text-muted-foreground text-sm">No tables yet.</p>
              )}
            </div>
          </section>

          {/* Top items */}
          <section className="space-y-3">
            <h2 className="font-semibold">Top ordered items</h2>
            {data.topItems.length === 0 ? (
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
                            className="bg-primary h-1.5 rounded-full transition-all"
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
      )}
    </div>
  );
}
