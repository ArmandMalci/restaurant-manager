import { createZodDto } from 'nestjs-zod'
import { CreateShiftSchema, UpdateShiftSchema } from '@restaurant/shared'

export class CreateShiftDto extends createZodDto(CreateShiftSchema) {}
export class UpdateShiftDto extends createZodDto(UpdateShiftSchema) {}
