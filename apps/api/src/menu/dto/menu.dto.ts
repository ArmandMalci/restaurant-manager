import { createZodDto } from 'nestjs-zod';
import {
  CreateMenuCategorySchema,
  UpdateMenuCategorySchema,
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
} from '@restaurant/shared';

export class CreateMenuCategoryDto extends createZodDto(CreateMenuCategorySchema) {}
export class UpdateMenuCategoryDto extends createZodDto(UpdateMenuCategorySchema) {}
export class CreateMenuItemDto extends createZodDto(CreateMenuItemSchema) {}
export class UpdateMenuItemDto extends createZodDto(UpdateMenuItemSchema) {}
export class CreateModifierGroupDto extends createZodDto(CreateModifierGroupSchema) {}
export class UpdateModifierGroupDto extends createZodDto(UpdateModifierGroupSchema) {}
