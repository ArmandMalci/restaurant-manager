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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { BillingService } from './billing.service';
import type { CreateBillDto } from './dto/billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  public constructor(private readonly billing: BillingService) {}

  @Post()
  public create(@Body() dto: CreateBillDto) {
    return this.billing.create(dto);
  }

  @Get(':id')
  public findOne(@Param('id') id: string) {
    return this.billing.findOne(id);
  }

  @Patch(':id/pay')
  @HttpCode(HttpStatus.OK)
  public pay(@Param('id') id: string) {
    return this.billing.pay(id);
  }
}
