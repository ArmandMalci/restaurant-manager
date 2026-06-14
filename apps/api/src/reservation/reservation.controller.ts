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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { ReservationService } from './reservation.service';
import type { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationController {
  public constructor(private readonly reservations: ReservationService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations, optionally filtered by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date', required: false })
  public getAll(@Query('date') date?: string) {
    return this.reservations.findAll(date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  public getOne(@Param('id') id: string) {
    return this.reservations.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a reservation' })
  public create(@Body() dto: CreateReservationDto) {
    return this.reservations.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  public update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reservation' })
  public remove(@Param('id') id: string) {
    return this.reservations.remove(id);
  }
}
