import { z } from 'zod'

export const BillSplitSchema = z.object({
  guestLabel: z.string().min(1),
  itemIds: z.array(z.string().uuid()),
  subtotal: z.number().nonnegative(),
})
export type BillSplit = z.infer<typeof BillSplitSchema>

export const BillSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  subtotal: z.number().nonnegative(),
  discountType: z.enum(['percentage', 'fixed']).nullable(),
  discountValue: z.number().nonnegative().nullable(),
  tipType: z.enum(['percentage', 'fixed']).nullable(),
  tipValue: z.number().nonnegative().nullable(),
  total: z.number().nonnegative(),
  paid: z.boolean().default(false),
  splits: z.array(BillSplitSchema).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Bill = z.infer<typeof BillSchema>

export const CreateBillSchema = z.object({
  orderId: z.string().uuid(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().nonnegative().optional(),
  tipType: z.enum(['percentage', 'fixed']).optional(),
  tipValue: z.number().nonnegative().optional(),
  splits: z.array(BillSplitSchema).optional(),
})
export type CreateBillDto = z.infer<typeof CreateBillSchema>
