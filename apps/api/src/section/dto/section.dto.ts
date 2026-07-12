import { createZodDto } from 'nestjs-zod';
import { CreateSectionSchema, UpdateSectionSchema } from '@restaurant/shared';

export class CreateSectionDto extends createZodDto(CreateSectionSchema) {}
export class UpdateSectionDto extends createZodDto(UpdateSectionSchema) {}
