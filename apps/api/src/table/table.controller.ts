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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TableDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TableService } from './table.service';
import { CreateTableDto, UpdateTableDto, SetTableStatusDto } from './dto/table.dto';

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TableController {
  public constructor(private readonly tables: TableService) {}

  @Get()
  @ApiOperation({ summary: 'List all tables' })
  @ApiResponse({ status: 200, type: [TableDto] })
  public getAll() {
    return this.tables.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a table by id' })
  @ApiResponse({ status: 200, type: TableDto })
  public getOne(@Param('id') id: string) {
    return this.tables.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a table' })
  @ApiBody({ type: CreateTableDto })
  @ApiResponse({ status: 201, type: TableDto })
  public create(@Body() dto: CreateTableDto) {
    return this.tables.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a table' })
  @ApiBody({ type: UpdateTableDto })
  @ApiResponse({ status: 200, type: TableDto })
  public update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tables.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a table' })
  public remove(@Param('id') id: string) {
    return this.tables.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Set table status' })
  @ApiBody({ type: SetTableStatusDto })
  @ApiResponse({ status: 200, type: TableDto })
  public setStatus(@Param('id') id: string, @Body() dto: SetTableStatusDto) {
    return this.tables.setStatus(id, dto);
  }
}
