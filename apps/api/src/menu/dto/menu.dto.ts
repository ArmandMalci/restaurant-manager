import { createZodDto } from 'nestjs-zod'
import {
  CreateMenuCategorySchema,
  UpdateMenuCategorySchema,
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
} from '@restaurant/shared'

export class CreateMenuCategoryDto extends createZodDto(CreateMenuCategorySchema) {}
export class UpdateMenuCategoryDto extends createZodDto(UpdateMenuCategorySchema) {}
export class CreateMenuItemDto extends createZodDto(CreateMenuItemSchema) {}
export class UpdateMenuItemDto extends createZodDto(UpdateMenuItemSchema) {}
