import { z } from 'zod';

export const TableStatusSchema = z.enum(['available', 'occupied', 'reserved']);
export type TableStatus = z.infer<typeof TableStatusSchema>;

export const TableSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  seats: z.number().int().positive(),
  status: TableStatusSchema,
  posX: z.number().min(0).max(100).nullable().default(null),
  posY: z.number().min(0).max(100).nullable().default(null),
  shape: z.enum(['square', 'round']).default('square'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Table = z.infer<typeof TableSchema>;

export const CreateTableSchema = TableSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateTableDto = z.infer<typeof CreateTableSchema>;

export const UpdateTableSchema = CreateTableSchema.partial();
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>;

export const SetTableStatusSchema = z.object({ status: TableStatusSchema });
export type SetTableStatusDto = z.infer<typeof SetTableStatusSchema>;

export const TableLayoutItemSchema = z.object({
  id: z.string().uuid(),
  posX: z.number().min(0).max(100),
  posY: z.number().min(0).max(100),
  shape: z.enum(['square', 'round']),
});
export const SaveTableLayoutSchema = z.object({ tables: z.array(TableLayoutItemSchema) });
export type SaveTableLayoutDto = z.infer<typeof SaveTableLayoutSchema>;
