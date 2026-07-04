import { createZodDto } from 'nestjs-zod';
import { CreateBillSchema, CreatePaymentSchema } from '@restaurant/shared';

export class CreateBillDto extends createZodDto(CreateBillSchema) {}
export class CreatePaymentDto extends createZodDto(CreatePaymentSchema) {}
