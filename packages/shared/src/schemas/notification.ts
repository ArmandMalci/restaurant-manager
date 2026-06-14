import { z } from 'zod';

export const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type SubscribeDto = z.infer<typeof SubscribeSchema>;
