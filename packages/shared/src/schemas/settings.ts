import { z } from 'zod';

export const RestaurantSettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  phone: z.string().max(50).nullable(),
  email: z.string().nullable(),
  address: z.string().max(200).nullable(),
  openingHours: z.string().nullable(),
  baseCurrency: z.string().min(1).max(10),
  exchangeRates: z.record(z.string(), z.number().positive()),
  updatedAt: z.coerce.date(),
});
export type RestaurantSettings = z.infer<typeof RestaurantSettingsSchema>;

export const UpdateSettingsSchema = RestaurantSettingsSchema.omit({
  id: true,
  updatedAt: true,
}).partial();
export type UpdateSettingsDto = z.infer<typeof UpdateSettingsSchema>;
