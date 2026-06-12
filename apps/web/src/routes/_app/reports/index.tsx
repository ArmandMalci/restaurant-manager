import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/reports/')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      <p className="mt-2 text-muted-foreground">Coming in a future plan.</p>
    </div>
  ),
})
