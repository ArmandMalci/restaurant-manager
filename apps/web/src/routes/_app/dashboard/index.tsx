import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back.</p>
    </div>
  );
}
