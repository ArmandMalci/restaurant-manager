import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { InventoryService } from './inventory.service';
import type {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustInventoryDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  findAll() {
    return this.inventory.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory item by id' })
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create an inventory item' })
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory item' })
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an inventory item' })
  remove(@Param('id') id: string) {
    return this.inventory.remove(id)
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock level' })
  adjust(@Param('id') id: string, @Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(id, dto);
  }
}
