import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceSnapshotDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceSnapshotService } from './service-snapshot.service';

@ApiTags('service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('service')
export class ServiceController {
  public constructor(private readonly snapshot: ServiceSnapshotService) {}

  @Get('snapshot')
  @ApiOperation({ summary: 'Live service snapshot: pulse, attention queue, floor' })
  @ApiResponse({ status: 200, type: ServiceSnapshotDto })
  public getSnapshot() {
    return this.snapshot.getSnapshot();
  }
}
