import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Download } from 'lucide-react';
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
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
});

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
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader title="Settings" subtitle="Restaurant profile and configuration" />

      {/* Section 1: Restaurant Info */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Info</CardTitle>
          <CardDescription>Update your restaurant's public-facing details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Restaurant Name *</Label>
                <Input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Restaurant"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-description">Description</Label>
                <Input
                  id="settings-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-email">Email</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@restaurant.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-address">Address</Label>
              <Input
                id="settings-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, Country"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-hours">Opening Hours</Label>
              <textarea
                id="settings-hours"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                rows={3}
                placeholder={'Mon–Fri 11:00–22:00\nSat–Sun 10:00–23:00'}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {saved && <span className="text-sm font-medium text-success">Saved!</span>}
              {update.isError && <span className="text-sm text-destructive">Failed to save</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Section 2: Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Color Theme</p>
            <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
            <div className="pt-1">
              <ThemeSelector />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section 3: Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Manage push notifications for orders and stock alerts on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  {notifEnabled
                    ? 'Receiving alerts on this device'
                    : 'Not subscribed on this device'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleNotifications}
                disabled={notifLoading}
              >
                {notifEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {notifLoading ? 'Updating…' : notifEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>

            {canInstall && !installed && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Install App</p>
                  <p className="text-xs text-muted-foreground">Faster access and offline support</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleInstall}>
                  <Download className="h-4 w-4" />
                  Install
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
