import { createZodDto } from 'nestjs-zod';
import { UpdateSettingsSchema } from '@restaurant/shared';

export class UpdateSettingsDto extends createZodDto(UpdateSettingsSchema) {}
