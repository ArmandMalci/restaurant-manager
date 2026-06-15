import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RestaurantSettingsDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  public constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles('manager', 'waiter', 'kitchen', 'host')
  @ApiOperation({ summary: 'Get restaurant settings' })
  @ApiResponse({ status: 200, type: RestaurantSettingsDto })
  public get() {
    return this.settings.get();
  }

  @Patch()
  @Roles('manager')
  @ApiOperation({ summary: 'Update restaurant settings' })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ status: 200, type: RestaurantSettingsDto })
  public update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
