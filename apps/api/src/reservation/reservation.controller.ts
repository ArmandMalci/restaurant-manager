import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { ReservationService } from './reservation.service'
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto'

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservations: ReservationService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations, optionally filtered by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date', required: false })
  getAll(@Query('date') date?: string) {
    return this.reservations.findAll(date)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  getOne(@Param('id') id: string) {
    return this.reservations.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a reservation' })
  create(@Body() dto: CreateReservationDto) {
    return this.reservations.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reservation' })
  remove(@Param('id') id: string) {
    return this.reservations.remove(id)
  }
}
