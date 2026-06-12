import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useTables, useCreateTable, useUpdateTable, useDeleteTable, useSetTableStatus,
} from '@/lib/table-api'
import type { Table, TableStatus } from '@restaurant/shared'

export const Route = createFileRoute('/_app/tables/')({
  component: TablesPage,
})

function useConfirm() {
  return (msg: string) => window.confirm(msg)
}

const STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

const STATUS_CLASSES: Record<TableStatus, string> = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-red-100 text-red-800',
  reserved: 'bg-yellow-100 text-yellow-800',
}

const NEXT_STATUS: Record<TableStatus, TableStatus> = {
  available: 'occupied',
  occupied: 'reserved',
  reserved: 'available',
}

// ── Table form ────────────────────────────────────────────────────────

function TableForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Table>
  onSave: (data: { number: number; seats: number; status: TableStatus }) => void
  onCancel: () => void
}) {
  const [number, setNumber] = useState(initial?.number ?? 1)
  const [seats, setSeats] = useState(initial?.seats ?? 2)
  const [status, setStatus] = useState<TableStatus>(initial?.status ?? 'available')

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        onSave({ number, seats, status })
      }}
      className="flex flex-wrap items-end gap-3 rounded-md border p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Table #
        <input
          type="number"
          min={1}
          value={number}
          onChange={e => setNumber(Number(e.target.value))}
          required
          className="w-20 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Seats
        <input
          type="number"
          min={1}
          value={seats}
          onChange={e => setSeats(Number(e.target.value))}
          required
          className="w-20 rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select
          value={status}
          onChange={e => setStatus(e.target.value as TableStatus)}
          className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────

function TablesPage() {
  const confirm = useConfirm()
  const [formMode, setFormMode] = useState<'none' | 'create' | { id: string }>('none')

  const { data: tables = [], isLoading } = useTables()
  const createTable = useCreateTable()
  const updateTable = useUpdateTable()
  const deleteTable = useDeleteTable()
  const setStatus = useSetTableStatus()

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading tables…</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tables.length} table{tables.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setFormMode('create')}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add table
        </button>
      </div>

      {formMode === 'create' && (
        <TableForm
          onSave={data => {
            createTable.mutate(data, { onSuccess: () => setFormMode('none') })
          }}
          onCancel={() => setFormMode('none')}
        />
      )}

      {tables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tables yet. Add one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map(table => (
            <div key={table.id} className="rounded-lg border p-4 space-y-3">
              {typeof formMode === 'object' && formMode.id === table.id ? (
                <TableForm
                  initial={table}
                  onSave={dto => {
                    updateTable.mutate({ id: table.id, dto }, { onSuccess: () => setFormMode('none') })
                  }}
                  onCancel={() => setFormMode('none')}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold">Table {table.number}</p>
                      <p className="text-sm text-muted-foreground">{table.seats} seats</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setFormMode({ id: table.id })}
                        aria-label="Edit"
                        className="rounded p-1 hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete Table ${table.number}?`)) {
                            deleteTable.mutate(table.id)
                          }
                        }}
                        aria-label="Delete"
                        className="rounded p-1 text-destructive hover:bg-accent transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setStatus.mutate({ id: table.id, dto: { status: NEXT_STATUS[table.status] } })
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-75',
                      STATUS_CLASSES[table.status],
                    )}
                  >
                    {STATUS_LABELS[table.status]}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
