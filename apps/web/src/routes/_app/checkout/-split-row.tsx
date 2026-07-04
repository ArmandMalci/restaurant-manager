/**
 * SplitRow — one split bucket: amount + payment method select + record button.
 * Dash-prefixed: not a route.
 */
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreatePaymentDtoMethod as Method } from '@/api/restaurantManagerAPI.schemas';
import type { CreatePaymentDtoMethod } from '@/api/restaurantManagerAPI.schemas';

export interface SplitRowProps {
  index: number;
  amount: number;
  disabled: boolean;
  method: CreatePaymentDtoMethod;
  onMethodChange: (method: CreatePaymentDtoMethod) => void;
  onRecord: () => void;
  isRecording: boolean;
}

export function SplitRow({
  index,
  amount,
  disabled,
  method,
  onMethodChange,
  onRecord,
  isRecording,
}: SplitRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
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
      <Button variant="outline" size="sm" disabled={disabled || isRecording} onClick={onRecord}>
        {isRecording ? 'Recording…' : 'Record payment'}
      </Button>
    </div>
  );
}
