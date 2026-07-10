import { createZodDto } from 'nestjs-zod';
import {
  AddOrderItemsSchema,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  UpdateOrderItemStatusSchema,
} from '@restaurant/shared';

export class CreateOrderDto extends createZodDto(CreateOrderSchema) {}
export class UpdateOrderStatusDto extends createZodDto(UpdateOrderStatusSchema) {}
export class UpdateOrderItemStatusDto extends createZodDto(UpdateOrderItemStatusSchema) {}
export class AddOrderItemsDto extends createZodDto(AddOrderItemsSchema) {}
