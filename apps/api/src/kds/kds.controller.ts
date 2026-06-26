import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KdsTicketDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KdsService } from './kds.service';

@ApiTags('kds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kds')
export class KdsController {
  public constructor(private readonly kds: KdsService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Active kitchen tickets (oldest first)' })
  @ApiResponse({ status: 200, type: [KdsTicketDto] })
  public getTickets() {
    return this.kds.getTickets();
  }
}
