import { createZodDto } from 'nestjs-zod'
import { CreateInventoryItemSchema, UpdateInventoryItemSchema, AdjustInventorySchema } from '@restaurant/shared'

export class CreateInventoryItemDto extends createZodDto(CreateInventoryItemSchema) {}
export class UpdateInventoryItemDto extends createZodDto(UpdateInventoryItemSchema) {}
export class AdjustInventoryDto extends createZodDto(AdjustInventorySchema) {}
