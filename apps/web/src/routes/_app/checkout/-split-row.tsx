/**
 * SplitRow — one split bucket: amount + payment method select + record button.
 * Cash payments get a multi-currency tender sub-form with a live change-due readout.
 * Dash-prefixed: not a route.
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreatePaymentDtoMethod as Method } from '@/api/restaurantManagerAPI.schemas';
import type { CreatePaymentDtoMethod } from '@/api/restaurantManagerAPI.schemas';
import { computeChange, type CashTender } from './-split-math';

export interface CashTenderInfo {
  tenders: CashTender[];
  change: number;
}

export interface SplitRowProps {
  index: number;
  amount: number;
  disabled: boolean;
  method: CreatePaymentDtoMethod;
  onMethodChange: (method: CreatePaymentDtoMethod) => void;
  onRecord: (cash?: CashTenderInfo) => void;
  isRecording: boolean;
  baseCurrency: string;
  exchangeRates: Record<string, number>;
}

export function SplitRow({
  index,
  amount,
  disabled,
  method,
  onMethodChange,
  onRecord,
  isRecording,
  baseCurrency,
  exchangeRates,
}: SplitRowProps) {
  const currencyOptions = [baseCurrency, ...Object.keys(exchangeRates)];
  const [tenders, setTenders] = useState<CashTender[]>([{ currencyCode: baseCurrency, amount }]);

  // A fresh bucket (amount/base currency changed) resets to one exact-amount row in the
  // base currency — the common single-currency exact-payment case needs no extra input.
  useEffect(() => {
    setTenders([{ currencyCode: baseCurrency, amount }]);
  }, [amount, baseCurrency]);

  function addTenderRow() {
    const used = new Set(tenders.map((t) => t.currencyCode));
    const nextCode = currencyOptions.find((c) => !used.has(c)) ?? baseCurrency;

    setTenders((prev) => [...prev, { currencyCode: nextCode, amount: 0 }]);
  }

  function removeTenderRow(i: number) {
    setTenders((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTenderRow(i: number, patch: Partial<CashTender>) {
    setTenders((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  const isCash = method === Method.cash;
  const change = isCash ? computeChange(amount, tenders, baseCurrency, exchangeRates) : 0;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">Split {index + 1}</p>
          <p className="font-mono text-sm font-semibold text-foreground">${amount.toFixed(2)}</p>
        </div>
        <Select
          value={method}
          onValueChange={(v) => onMethodChange((v ?? Method.cash) as CreatePaymentDtoMethod)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={Method.cash}>Cash</SelectItem>
            <SelectItem value={Method.card}>Card</SelectItem>
            <SelectItem value={Method.other}>Other</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isRecording}
          onClick={() => onRecord(isCash ? { tenders, change } : undefined)}
        >
          {isRecording ? 'Recording…' : 'Record payment'}
        </Button>
      </div>

      {isCash && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {tenders.map((tender, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable identity beyond position
            <div key={i} className="flex items-center gap-2">
              <Select
                value={tender.currencyCode}
                onValueChange={(v) => v && updateTenderRow(i, { currencyCode: v as string })}
              >
                <SelectTrigger className="w-24" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={tender.amount}
                onChange={(e) => updateTenderRow(i, { amount: Number(e.target.value) })}
                className="max-w-28"
              />
              {tenders.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove currency"
                  onClick={() => removeTenderRow(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addTenderRow}>
              <Plus className="h-4 w-4" />
              Add currency
            </Button>
            <p
              className={`font-mono text-sm font-medium ${change < 0 ? 'text-destructive' : 'text-success'}`}
            >
              {change < 0
                ? `Still owed $${Math.abs(change).toFixed(2)}`
                : `Change due $${change.toFixed(2)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
