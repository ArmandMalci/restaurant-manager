import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/orders/')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <p className="mt-2 text-muted-foreground">Coming in a future plan.</p>
    </div>
  ),
})
