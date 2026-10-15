import { z } from 'zod';

export const StaffRoleSchema = z.enum(['manager', 'waiter', 'kitchen', 'host']);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const StaffSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  username: z.string().min(1).max(50),
  role: StaffRoleSchema,
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Staff = z.infer<typeof StaffSchema>;

export const CreateStaffSchema = StaffSchema.omit({
  id: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8),
});
export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = CreateStaffSchema.omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(8).optional(),
  });
export type UpdateStaffDto = z.infer<typeof UpdateStaffSchema>;

export const SetActiveSchema = z.object({ active: z.boolean() });
export type SetActiveDto = z.infer<typeof SetActiveSchema>;
