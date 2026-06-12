import { z } from 'zod'

export const TableStatusSchema = z.enum(['available', 'occupied', 'reserved'])
export type TableStatus = z.infer<typeof TableStatusSchema>

export const TableSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
  status: TableStatusSchema,
  waiterId: z.string().uuid().nullable(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Table = z.infer<typeof TableSchema>

export const CreateTableSchema = TableSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateTableDto = z.infer<typeof CreateTableSchema>

export const UpdateTableSchema = CreateTableSchema.partial()
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>
