import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useBill, useCreateBill, usePayBill } from '@/lib/billing-api'

export const Route = createFileRoute('/_app/billing/')({
  component: BillingPage,
})

function BillingPage() {
  const [orderId, setOrderId] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [billId, setBillId] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [createMsg, setCreateMsg] = useState('')

  const createBill = useCreateBill()
  const payBill = usePayBill()
  const { data: bill, isLoading: billLoading, isError: billError } = useBill(lookupId)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateMsg('')
    createBill.mutate(
      {
        orderId,
        discountPct: discountPct !== '' ? Number(discountPct) : 0,
      },
      {
        onSuccess: created => {
          setCreateMsg(`Bill created: ${created.id}`)
          setOrderId('')
          setDiscountPct('')
        },
        onError: () => setCreateMsg('Failed to create bill'),
      },
    )
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLookupId(billId.trim())
  }

  function handlePay() {
    if (bill) {
      payBill.mutate(bill.id)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage bills for orders</p>
      </div>

      {/* Create Bill */}
      <form onSubmit={handleCreate} className="space-y-4 rounded-lg border p-6">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Create Bill</h2>

        <label className="flex flex-col gap-1 text-sm">
          Order ID *
          <input
            type="text"
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            placeholder="Enter order ID"
            required
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Discount % (0–100)
          <input
            type="number"
            value={discountPct}
            onChange={e => setDiscountPct(e.target.value)}
            placeholder="0"
            min={0}
            max={100}
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createBill.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {createBill.isPending ? 'Creating…' : 'Create Bill'}
          </button>
          {createMsg && (
            <span className={`text-sm font-medium ${createMsg.startsWith('Failed') ? 'text-destructive' : 'text-green-600'}`}>
              {createMsg}
            </span>
          )}
        </div>
      </form>

      {/* Find Bill */}
      <form onSubmit={handleLookup} className="space-y-4 rounded-lg border p-6">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Find Bill</h2>

        <label className="flex flex-col gap-1 text-sm">
          Bill ID
          <input
            type="text"
            value={billId}
            onChange={e => setBillId(e.target.value)}
            placeholder="Enter bill ID"
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <button
          type="submit"
          disabled={!billId.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          Find Bill
        </button>
      </form>

      {/* Bill Details */}
      {lookupId && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Bill Details</h2>

          {billLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {billError && <p className="text-sm text-destructive">Bill not found</p>}

          {bill && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono">{bill.id}</span>

                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono">{bill.orderId}</span>

                <span className="text-muted-foreground">Subtotal</span>
                <span>${Number(bill.subtotal).toFixed(2)}</span>

                <span className="text-muted-foreground">Discount</span>
                <span>{bill.discountPct}%</span>

                <span className="text-muted-foreground">Tax</span>
                <span>${Number(bill.tax).toFixed(2)}</span>

                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">${Number(bill.total).toFixed(2)}</span>

                <span className="text-muted-foreground">Status</span>
                <span className={bill.paid ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                  {bill.paid ? 'Paid' : 'Unpaid'}
                </span>

                {bill.paidAt && (
                  <>
                    <span className="text-muted-foreground">Paid At</span>
                    <span>{new Date(bill.paidAt).toLocaleString()}</span>
                  </>
                )}
              </div>

              {!bill.paid && (
                <button
                  onClick={handlePay}
                  disabled={payBill.isPending}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {payBill.isPending ? 'Processing…' : 'Mark as Paid'}
                </button>
              )}
              {payBill.isSuccess && bill.paid && (
                <span className="text-sm text-green-600 font-medium">Payment recorded!</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
