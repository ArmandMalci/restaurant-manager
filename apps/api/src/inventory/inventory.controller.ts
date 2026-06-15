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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InventoryItemWithStatusDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InventoryService } from './inventory.service';
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
  public constructor(private readonly inventory: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all inventory items' })
  @ApiResponse({ status: 200, type: [InventoryItemWithStatusDto] })
  public findAll() {
    return this.inventory.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory item by id' })
  @ApiResponse({ status: 200, type: InventoryItemWithStatusDto })
  public findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an inventory item' })
  @ApiResponse({ status: 201, type: InventoryItemWithStatusDto })
  public create(@Body() dto: CreateInventoryItemDto) {
    return this.inventory.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiResponse({ status: 200, type: InventoryItemWithStatusDto })
  public update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an inventory item' })
  public remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust stock level' })
  @ApiResponse({ status: 201, type: InventoryItemWithStatusDto })
  public adjust(@Param('id') id: string, @Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(id, dto);
  }
}
