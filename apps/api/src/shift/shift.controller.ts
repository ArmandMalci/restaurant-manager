import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { ShiftService } from './shift.service'
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto'

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shifts: ShiftService) {}

  @Get()
  @ApiOperation({ summary: 'List shifts, optionally filtered by date range (YYYY-MM-DD)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.shifts.findAll(from, to)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  getOne(@Param('id') id: string) {
    return this.shifts.findOne(id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Create a shift' })
  create(@Body() dto: CreateShiftDto) {
    return this.shifts.create(dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @ApiOperation({ summary: 'Update a shift' })
  update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shifts.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift' })
  remove(@Param('id') id: string) {
    return this.shifts.remove(id)
  }
}
