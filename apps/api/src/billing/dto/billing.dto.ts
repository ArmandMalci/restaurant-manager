import { createZodDto } from 'nestjs-zod'
import { CreateBillSchema } from '@restaurant/shared'

export class CreateBillDto extends createZodDto(CreateBillSchema) {}
