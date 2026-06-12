import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/reservations/')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
      <p className="mt-2 text-muted-foreground">Coming in a future plan.</p>
    </div>
  ),
})
