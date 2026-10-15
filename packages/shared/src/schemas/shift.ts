import { z } from 'zod';

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  staffId: z.string().uuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type Shift = z.infer<typeof ShiftSchema>;

export const CreateShiftSchema = z.object({
  staffId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().optional().nullable(),
});
export type CreateShiftDto = z.infer<typeof CreateShiftSchema>;

export const UpdateShiftSchema = CreateShiftSchema.partial();
export type UpdateShiftDto = z.infer<typeof UpdateShiftSchema>;
