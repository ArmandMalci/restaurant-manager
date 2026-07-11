import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Download, Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
});

// ponytail: fixed shortlist, not a full ISO 4217 table — add codes here as venues need them.
const CURRENCY_CODES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'CAD',
  'AUD',
  'JPY',
] as const;

interface RateRow {
  code: string;
  rate: string;
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
  const [notifError, setNotifError] = useState<string | null>(null);

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
    setNotifError(null);
    const prev = notifEnabled;

    try {
      if (notifEnabled) {
        await unsubscribe();
        setNotifEnabled(false);
      } else {
        const ok = await subscribe();

        setNotifEnabled(ok);
      }
    } catch {
      setNotifEnabled(prev);
      setNotifError('Permission denied — notifications are blocked in your browser.');
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

  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [rateRows, setRateRows] = useState<RateRow[]>([]);
  const [currencySaved, setCurrencySaved] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name ?? '');
      setDescription(data.description ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setAddress(data.address ?? '');
      setOpeningHours(data.openingHours ?? '');
      setBaseCurrency(data.baseCurrency ?? 'EUR');
      setRateRows(
        Object.entries(data.exchangeRates ?? {}).map(([code, rate]) => ({
          code,
          rate: String(rate),
        })),
      );
    }
  }, [data]);

  function addCurrencyRow() {
    const used = new Set([baseCurrency, ...rateRows.map((r) => r.code)]);
    const nextCode = CURRENCY_CODES.find((c) => !used.has(c)) ?? '';

    setRateRows((prev) => [...prev, { code: nextCode, rate: '1' }]);
  }

  function removeCurrencyRow(index: number) {
    setRateRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCurrencyRow(index: number, patch: Partial<RateRow>) {
    setRateRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function handleCurrencySave() {
    const exchangeRates = Object.fromEntries(
      rateRows
        .filter(
          (r) =>
            r.code && r.code !== baseCurrency && r.rate !== '' && !Number.isNaN(Number(r.rate)),
        )
        .map((r) => [r.code, Number(r.rate)]),
    );

    update.mutate(
      { data: { baseCurrency, exchangeRates } },
      {
        onSuccess: () => {
          setCurrencySaved(true);
          setTimeout(() => setCurrencySaved(false), 2000);
        },
      },
    );
  }

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

      {/* Section 2: Currency */}
      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Base currency and exchange rates used for multi-currency cash tender at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="settings-base-currency">Base Currency</Label>
            <Select value={baseCurrency} onValueChange={(v) => v && setBaseCurrency(v as string)}>
              <SelectTrigger id="settings-base-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exchange rates (to {baseCurrency})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCurrencyRow}>
                <Plus className="h-4 w-4" />
                Add currency
              </Button>
            </div>

            {rateRows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No additional currencies configured — cashiers can only tender in {baseCurrency}.
              </p>
            )}

            {rateRows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable identity beyond position
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={row.code}
                  onValueChange={(v) => v && updateCurrencyRow(i, { code: v as string })}
                >
                  <SelectTrigger className="w-28" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_CODES.filter((c) => c !== baseCurrency).map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={row.rate}
                  onChange={(e) => updateCurrencyRow(i, { rate: e.target.value })}
                  placeholder="1.17"
                  className="max-w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove currency"
                  onClick={() => removeCurrencyRow(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="button" disabled={update.isPending} onClick={handleCurrencySave}>
              {update.isPending ? 'Saving…' : 'Save currency settings'}
            </Button>
            {currencySaved && <span className="text-sm font-medium text-success">Saved!</span>}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Section 3: Appearance */}
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

      {/* Section 4: Notifications */}
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

            {notifError && <p className="text-xs text-destructive">{notifError}</p>}

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
