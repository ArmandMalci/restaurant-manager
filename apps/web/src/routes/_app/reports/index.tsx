import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useReportsControllerGetDaily,
  useReportsControllerGetSummary,
} from '@/api/reports/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCell } from '@/components/ui/metric-cell';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

const MAX_RANGE_DAYS = 92;

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
  sent: 'bg-accent/10 text-accent',
  in_progress: 'bg-warning/10 text-warning',
  ready: 'bg-success/10 text-success',
  served: 'bg-secondary text-secondary-foreground',
};

const TABLE_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  occupied: 'bg-info',
  reserved: 'bg-warning',
};

function MetricCellSkeleton() {
  return (
    <div className="bg-card border-border rounded-lg border p-3 space-y-1">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-16 mt-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ReportsPage() {
  const { data, isLoading, refetch, isFetching } = useReportsControllerGetSummary();

  const [from, setFrom] = useState(() => dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().format('YYYY-MM-DD'));
  const {
    data: daily,
    isLoading: dailyLoading,
    isError: dailyIsError,
  } = useReportsControllerGetDaily({ from, to }, { query: { enabled: Boolean(from && to) } });

  const totalOrders = data ? Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0) : 0;
  const totalTables = data ? Object.values(data.tablesByStatus).reduce((a, b) => a + b, 0) : 0;
  const occupiedTables = data?.tablesByStatus.occupied ?? 0;
  const occupiedPct = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const headerAction = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => refetch()}
      disabled={isFetching}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
      Refresh
    </Button>
  );

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Reports" action={headerAction} />

      {/* KPI metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          <>
            <MetricCellSkeleton />
            <MetricCellSkeleton />
            <MetricCellSkeleton />
            <MetricCellSkeleton />
          </>
        ) : !data ? (
          <p className="text-muted-foreground col-span-4 text-sm">No data available.</p>
        ) : (
          <>
            <MetricCell label="Total Orders" value={totalOrders} />
            <MetricCell
              label="Tables Occupied"
              value={`${occupiedPct}%`}
              sub={`${occupiedTables} of ${totalTables} tables`}
            />
            <MetricCell label="Reservations Today" value={data.reservationsToday} />
            <MetricCell
              label="Top Item"
              value={data.topItems[0]?.totalQuantity ?? 0}
              sub={data.topItems[0]?.name ?? '—'}
            />
          </>
        )}
      </div>

      {/* Top ordered items — chart card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Top Ordered Items</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Order status breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Table status overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Table Status</CardTitle>
        </CardHeader>
        <CardContent>
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
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2"
                >
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
        </CardContent>
      </Card>

      {/* Daily breakdown — orders, revenue, reservations per day over a date range */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-sm font-medium">Daily Breakdown</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="reports-daily-from" className="text-muted-foreground text-sm">
                From
              </Label>
              <Input
                id="reports-daily-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="reports-daily-to" className="text-muted-foreground text-sm">
                To
              </Label>
              <Input
                id="reports-daily-to"
                type="date"
                value={to}
                min={from}
                max={dayjs(from)
                  .add(MAX_RANGE_DAYS - 1, 'day')
                  .format('YYYY-MM-DD')}
                onChange={(e) => setTo(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : dailyIsError ? (
            <p className="text-destructive text-sm">
              Could not load the daily report for this range.
            </p>
          ) : !daily || daily.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data for this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Reservations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{dayjs(row.date).format('ddd, MMM D')}</TableCell>
                    <TableCell>{row.orderCount}</TableCell>
                    <TableCell>${row.revenue.toFixed(2)}</TableCell>
                    <TableCell>{row.reservationCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
