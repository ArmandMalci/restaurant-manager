import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DailyReportRowDto, ReportSummaryDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  public constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get operational summary: orders, tables, reservations, top items' })
  @ApiResponse({ status: 200, type: ReportSummaryDto })
  public getSummary() {
    return this.reports.getSummary();
  }

  @Get('daily')
  @ApiOperation({
    summary: 'Get per-day order count, revenue, and reservation count for a date range',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD), inclusive' })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'End date (YYYY-MM-DD), inclusive, max 92 days after `from`',
  })
  @ApiResponse({ status: 200, type: [DailyReportRowDto] })
  public getDaily(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.getDaily(from, to);
  }
}
