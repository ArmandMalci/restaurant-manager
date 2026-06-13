import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useSettings, useUpdateSettings } from '@/lib/settings-api'

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
})

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}

function SettingsPage() {
  const { data, isLoading } = useSettings()
  const update = useUpdateSettings()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) {
      setName(data.name ?? '')
      setDescription(data.description ?? '')
      setPhone(data.phone ?? '')
      setEmail(data.email ?? '')
      setAddress(data.address ?? '')
      setOpeningHours(data.openingHours ?? '')
    }
  }, [data])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate(
      {
        name: name || undefined,
        description: description || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        openingHours: openingHours || undefined,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restaurant profile and configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Restaurant Info</h2>

        <Field label="Name *" value={name} onChange={setName} placeholder="My Restaurant" />
        <Field label="Description" value={description} onChange={setDescription} placeholder="A short description…" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+1 555 0100" />
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="hello@restaurant.com" />
        </div>

        <Field label="Address" value={address} onChange={setAddress} placeholder="123 Main St, City, Country" />

        <label className="flex flex-col gap-1 text-sm">
          Opening Hours
          <textarea
            value={openingHours}
            onChange={e => setOpeningHours(e.target.value)}
            rows={3}
            placeholder="Mon–Fri 11:00–22:00&#10;Sat–Sun 10:00–23:00"
            className="rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={update.isPending}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          {update.isError && <span className="text-sm text-destructive">Failed to save</span>}
        </div>
      </form>
    </div>
  )
}
