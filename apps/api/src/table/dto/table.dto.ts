import { createZodDto } from 'nestjs-zod'
import { CreateTableSchema, UpdateTableSchema, SetTableStatusSchema } from '@restaurant/shared'

export class CreateTableDto extends createZodDto(CreateTableSchema) {}
export class UpdateTableDto extends createZodDto(UpdateTableSchema) {}
export class SetTableStatusDto extends createZodDto(SetTableStatusSchema) {}
