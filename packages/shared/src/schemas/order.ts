import { z } from 'zod';

export const OrderStatusSchema = z.enum(['draft', 'sent', 'in_progress', 'ready', 'served']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemStatusSchema = z.enum(['pending', 'in_progress', 'ready']);
export type OrderItemStatus = z.infer<typeof OrderItemStatusSchema>;

export const OrderItemModifierSchema = z.object({
  id: z.string().uuid(),
  orderItemId: z.string().uuid(),
  modifierOptionId: z.string().uuid(),
  name: z.string(),
  priceDelta: z.number(),
});
export type OrderItemModifier = z.infer<typeof OrderItemModifierSchema>;

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  status: OrderItemStatusSchema.default('pending'),
  notes: z.string().max(500).nullable(),
  unitPrice: z.number().default(0),
  modifiers: z.array(OrderItemModifierSchema).default([]),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid(),
  staffId: z.string().uuid(),
  status: OrderStatusSchema.default('draft'),
  notes: z.string().max(500).nullable(),
  items: z.array(OrderItemSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
  modifierOptionIds: z.array(z.string().uuid()).default([]),
});
export type CreateOrderItemDto = z.infer<typeof CreateOrderItemSchema>;

export const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(CreateOrderItemSchema).min(1),
});
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export const AddOrderItemsSchema = z.object({
  items: z.array(CreateOrderItemSchema).min(1),
});
export type AddOrderItemsDto = z.infer<typeof AddOrderItemsSchema>;

export const UpdateOrderStatusSchema = z.object({ status: OrderStatusSchema });
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;

export const UpdateOrderItemStatusSchema = z.object({ status: OrderItemStatusSchema });
export type UpdateOrderItemStatusDto = z.infer<typeof UpdateOrderItemStatusSchema>;
