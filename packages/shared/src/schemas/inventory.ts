import { z } from 'zod';

export const InventoryUnitSchema = z.enum(['kg', 'litre', 'unit']);
export type InventoryUnit = z.infer<typeof InventoryUnitSchema>;

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  unit: InventoryUnitSchema,
  quantity: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CreateInventoryItemSchema = InventoryItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateInventoryItemDto = z.infer<typeof CreateInventoryItemSchema>;

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();
export type UpdateInventoryItemDto = z.infer<typeof UpdateInventoryItemSchema>;

export const AdjustInventorySchema = z.object({
  delta: z.number(),
  reason: z.enum(['delivery', 'waste', 'correction']),
});
export type AdjustInventoryDto = z.infer<typeof AdjustInventorySchema>;
