import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Save, Bell, BellOff, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSettingsControllerGet,
  useSettingsControllerUpdate,
  invalidateSettingsControllerGet,
} from '@/api/settings/settings';
import { subscribe, unsubscribe, isSubscribed } from '@/lib/notifications';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
});

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="focus-visible:ring-ring rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
      />
    </label>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useSettingsControllerGet();
  const update = useSettingsControllerUpdate({
    mutation: {
      onSuccess: () => invalidateSettingsControllerGet(qc),
    },
  });

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const { canInstall, install } = useInstallPrompt();
  const [installed, setInstalled] = useState(false);

  async function handleInstall() {
    const accepted = await install();

    if (accepted) setInstalled(true);
  }

  useEffect(() => {
    isSubscribed().then(setNotifEnabled);
  }, []);

  async function toggleNotifications() {
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        await unsubscribe();
        setNotifEnabled(false);
      } else {
        const ok = await subscribe();

        setNotifEnabled(ok);
      }
    } finally {
      setNotifLoading(false);
    }
  }

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setDescription(data.description ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setAddress(data.address ?? '');
      setOpeningHours(data.openingHours ?? '');
    }
  }, [data]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        data: {
          name: name || undefined,
          description: description || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          openingHours: openingHours || undefined,
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Restaurant profile and configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Restaurant Info
        </h2>

        <Field label="Name *" value={name} onChange={setName} placeholder="My Restaurant" />
        <Field
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="A short description…"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            type="tel"
            placeholder="+1 555 0100"
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="hello@restaurant.com"
          />
        </div>

        <Field
          label="Address"
          value={address}
          onChange={setAddress}
          placeholder="123 Main St, City, Country"
        />

        <label className="flex flex-col gap-1 text-sm">
          Opening Hours
          <textarea
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            rows={3}
            placeholder="Mon–Fri 11:00–22:00&#10;Sat–Sun 10:00–23:00"
            className="focus-visible:ring-ring resize-none rounded-md border px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={update.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm font-medium text-green-600">Saved!</span>}
          {update.isError && <span className="text-destructive text-sm">Failed to save</span>}
        </div>
      </form>

      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Notifications
        </h2>
        <p className="text-muted-foreground text-sm">
          Receive push notifications for orders and stock alerts on this device.
        </p>
        <button
          type="button"
          onClick={toggleNotifications}
          disabled={notifLoading}
          className="hover:bg-accent flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {notifEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notifLoading
            ? 'Updating…'
            : notifEnabled
              ? 'Disable notifications'
              : 'Enable notifications'}
        </button>
      </div>

      {canInstall && !installed && (
        <div className="space-y-4 rounded-lg border p-6">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Install App
          </h2>
          <p className="text-muted-foreground text-sm">
            Install Restaurant Manager on this device for faster access and offline support.
          </p>
          <button
            type="button"
            onClick={handleInstall}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Install App
          </button>
        </div>
      )}
    </div>
  );
}
