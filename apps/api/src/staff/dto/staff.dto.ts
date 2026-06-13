import { createZodDto } from 'nestjs-zod'
import { CreateStaffSchema, UpdateStaffSchema, SetActiveSchema } from '@restaurant/shared'

export class CreateStaffDto extends createZodDto(CreateStaffSchema) {}
export class UpdateStaffDto extends createZodDto(UpdateStaffSchema) {}
export class SetActiveDto extends createZodDto(SetActiveSchema) {}
