import { z } from 'zod';

export const SectionSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type Section = z.infer<typeof SectionSchema>;

export const CreateSectionSchema = SectionSchema.omit({ id: true, restaurantId: true });
export type CreateSectionDto = z.infer<typeof CreateSectionSchema>;

export const UpdateSectionSchema = CreateSectionSchema.partial();
export type UpdateSectionDto = z.infer<typeof UpdateSectionSchema>;
