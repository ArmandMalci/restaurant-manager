import { z } from 'zod'
import { StaffSchema } from './staff'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof LoginSchema>

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: StaffSchema.omit({ createdAt: true, updatedAt: true }),
})
export type AuthResponse = z.infer<typeof AuthResponseSchema>

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
})
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>
