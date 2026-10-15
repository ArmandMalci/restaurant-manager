import { z } from 'zod';

export const ReservationStatusSchema = z.enum(['booked', 'seated', 'no_show', 'cancelled']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const ReservationSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().max(20).nullable(),
  guestEmail: z.string().email().nullable(),
  partySize: z.number().int().positive(),
  date: z.coerce.date(),
  notes: z.string().max(500).nullable(),
  status: ReservationStatusSchema.default('booked'),
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
  date: z.string(),
  notes: z.string().max(500).nullable().optional(),
});
export type CreateReservationDto = z.infer<typeof CreateReservationSchema>;

// status is not on CreateReservationSchema — new reservations default to `booked`
// server-side (DB default); callers transition status via PATCH after creation.
export const UpdateReservationSchema = CreateReservationSchema.partial().extend({
  status: ReservationStatusSchema.optional(),
});
export type UpdateReservationDto = z.infer<typeof UpdateReservationSchema>;
