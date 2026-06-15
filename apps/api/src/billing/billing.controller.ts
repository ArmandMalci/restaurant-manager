import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillDto } from '../swagger-dtos';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import type { CreateBillDto } from './dto/billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  public constructor(private readonly billing: BillingService) {}

  @Post()
  @ApiResponse({ status: 201, type: BillDto })
  public create(@Body() dto: CreateBillDto) {
    return this.billing.create(dto);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: BillDto })
  public findOne(@Param('id') id: string) {
    return this.billing.findOne(id);
  }

  @Patch(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: BillDto })
  public pay(@Param('id') id: string) {
    return this.billing.pay(id);
  }
}
