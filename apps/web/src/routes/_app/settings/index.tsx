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
import { ThemeSelector } from '@/components/theme-selector';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
});

const INPUT_CLASS =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring';

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-6 py-5">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Restaurant profile and configuration</p>
      </div>

      {/* Section 1: Restaurant Info */}
      <SectionCard
        title="Restaurant Info"
        description="Update your restaurant's public-facing details."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FieldGroup label="Restaurant Name *" htmlFor="settings-name">
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Restaurant"
                className={INPUT_CLASS}
              />
            </FieldGroup>

            <FieldGroup label="Description" htmlFor="settings-description">
              <input
                id="settings-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description…"
                className={INPUT_CLASS}
              />
            </FieldGroup>

            <FieldGroup label="Phone" htmlFor="settings-phone">
              <input
                id="settings-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0100"
                className={INPUT_CLASS}
              />
            </FieldGroup>

            <FieldGroup label="Email" htmlFor="settings-email">
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@restaurant.com"
                className={INPUT_CLASS}
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Address" htmlFor="settings-address">
            <input
              id="settings-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, Country"
              className={INPUT_CLASS}
            />
          </FieldGroup>

          <FieldGroup label="Opening Hours" htmlFor="settings-hours">
            <textarea
              id="settings-hours"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              rows={3}
              placeholder={'Mon–Fri 11:00–22:00\nSat–Sun 10:00–23:00'}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FieldGroup>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={update.isPending}>
              <Save className="h-4 w-4" />
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {saved && <span className="text-sm font-medium text-success">Saved!</span>}
            {update.isError && <span className="text-sm text-destructive">Failed to save</span>}
          </div>
        </form>
      </SectionCard>

      {/* Section 2: Appearance */}
      <SectionCard title="Appearance" description="Customize the look and feel of your workspace.">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Color Theme</p>
          <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
          <div className="pt-1">
            <ThemeSelector />
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Notifications */}
      <SectionCard
        title="Notifications"
        description="Manage push notifications for orders and stock alerts on this device."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Push notifications</p>
              <p className="text-xs text-muted-foreground">
                {notifEnabled ? 'Receiving alerts on this device' : 'Not subscribed on this device'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleNotifications}
              disabled={notifLoading}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {notifEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {notifLoading ? 'Updating…' : notifEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {canInstall && !installed && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Install App</p>
                <p className="text-xs text-muted-foreground">Faster access and offline support</p>
              </div>
              <button
                type="button"
                onClick={handleInstall}
                className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
