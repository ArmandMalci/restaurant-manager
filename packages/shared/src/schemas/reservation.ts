import { z } from 'zod';

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  tableId: z.string().uuid().nullable(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().max(20).nullable(),
  guestEmail: z.string().email().nullable(),
  partySize: z.number().int().positive(),
  date: z.coerce.date(),
  notes: z.string().max(500).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Reservation = z.infer<typeof ReservationSchema>;

export const CreateReservationSchema = z.object({
  tableId: z.string().uuid(),
  guestName: z.string().min(1).max(100),
  guestEmail: z.string().email().nullable().optional(),
  guestPhone: z.string().max(20).nullable().optional(),
  partySize: z.number().int().positive(),
  date: z.coerce.date(),
  notes: z.string().max(500).nullable().optional(),
});
export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;

export const UpdateReservationSchema = CreateReservationSchema.partial();
export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>;
