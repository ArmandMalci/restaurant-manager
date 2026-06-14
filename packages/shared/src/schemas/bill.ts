import { z } from 'zod';

export const BillSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  subtotal: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).default(0),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  paid: z.boolean(),
  paidAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Bill = z.infer<typeof BillSchema>;

export const CreateBillSchema = z.object({
  orderId: z.string().uuid(),
  discountPct: z.number().min(0).max(100).optional().default(0),
});
export type CreateBillDto = z.infer<typeof CreateBillSchema>;

export const BillSplitSchema = z.object({
  guestLabel: z.string().min(1),
  itemIds: z.array(z.string().uuid()),
  subtotal: z.number().nonnegative(),
});
export type BillSplit = z.infer<typeof BillSplitSchema>;
