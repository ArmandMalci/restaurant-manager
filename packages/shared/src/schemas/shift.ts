import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  startTime: z.string().regex(timeRegex, 'Must be HH:MM'),
  endTime: z.string().regex(timeRegex, 'Must be HH:MM'),
  clockIn: z.coerce.date().nullable(),
  clockOut: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Shift = z.infer<typeof ShiftSchema>

export const CreateShiftSchema = ShiftSchema.omit({ id: true, clockIn: true, clockOut: true, createdAt: true, updatedAt: true })
export type CreateShiftDto = z.infer<typeof CreateShiftSchema>
