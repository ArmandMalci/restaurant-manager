import { createZodDto } from 'nestjs-zod';
import { CreateReservationSchema, UpdateReservationSchema } from '@restaurant/shared';

export class CreateReservationDto extends createZodDto(CreateReservationSchema) {}
export class UpdateReservationDto extends createZodDto(UpdateReservationSchema) {}
