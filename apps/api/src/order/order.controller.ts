import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderService } from './order.service';
import type {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
} from './dto/order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  public constructor(private readonly orders: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List orders, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  public getAll(@Query('status') status?: string) {
    return this.orders.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order with its items' })
  @ApiResponse({ status: 200, type: OrderDto })
  public getOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an order with items' })
  @ApiResponse({ status: 201, type: OrderDto })
  public create(@Body() dto: CreateOrderDto, @CurrentUser('id') staffId: string) {
    return this.orders.create(dto, staffId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, type: OrderDto })
  public updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto);
  }

  @Patch(':id/items/:itemId/status')
  @ApiOperation({ summary: 'Update order item status' })
  @ApiResponse({ status: 200, type: OrderDto })
  public updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.orders.updateItemStatus(id, itemId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an order' })
  public remove(@Param('id') id: string) {
    return this.orders.remove(id);
  }
}
