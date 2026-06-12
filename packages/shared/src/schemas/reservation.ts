import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}$/

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid().nullable(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().max(20).nullable(),
  guestEmail: z.string().email().nullable(),
  partySize: z.number().int().positive(),
  date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  time: z.string().regex(timeRegex, 'Must be HH:MM'),
  notes: z.string().max(500).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Reservation = z.infer<typeof ReservationSchema>

export const CreateReservationSchema = ReservationSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateReservationDto = z.infer<typeof CreateReservationSchema>

export const UpdateReservationSchema = CreateReservationSchema.partial()
export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>
