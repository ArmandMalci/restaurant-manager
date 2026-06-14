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
import type { StaffService } from './staff.service';
import type { CreateStaffDto, UpdateStaffDto, SetActiveDto } from './dto/staff.dto';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager')
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List all staff, optionally filtered by role' })
  @ApiQuery({ name: 'role', required: false })
  getAll(@Query('role') role?: string) {
    return this.staff.findAll(role)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a staff member by id' })
  getOne(@Param('id') id: string) {
    return this.staff.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Create a staff member' })
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a staff member' })
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a staff member' })
  remove(@Param('id') id: string) {
    return this.staff.remove(id)
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Set staff active status' })
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.staff.setActive(id, dto.active);
  }
}
