import { z } from 'zod';

export const TableStatusSchema = z.enum(['available', 'occupied', 'reserved']);
export type TableStatus = z.infer<typeof TableStatusSchema>;

export const TableSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  seats: z.number().int().positive(),
  status: TableStatusSchema,
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
