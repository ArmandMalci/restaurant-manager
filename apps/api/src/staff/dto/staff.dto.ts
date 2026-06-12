import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { CreateStaffSchema, UpdateStaffSchema } from '@restaurant/shared'

export class CreateStaffDto extends createZodDto(CreateStaffSchema) {}
export class UpdateStaffDto extends createZodDto(UpdateStaffSchema) {}
export class SetActiveDto extends createZodDto(z.object({ active: z.boolean() })) {}
