import { z } from 'zod';

export const RestaurantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  phone: z.string().max(50).nullable(),
  email: z.string().nullable(),
  address: z.string().max(200).nullable(),
  openingHours: z.string().nullable(),
  baseCurrency: z.string().min(1).max(10),
  exchangeRates: z.record(z.string(), z.number().positive()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const UpdateRestaurantSchema = RestaurantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export type UpdateRestaurantDto = z.infer<typeof UpdateRestaurantSchema>;
