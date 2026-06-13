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
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { BillingService } from './billing.service'
import { CreateBillDto } from './dto/billing.dto'

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  create(@Body() dto: CreateBillDto) {
    return this.billing.create(dto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.billing.findOne(id)
  }

  @Patch(':id/pay')
  @HttpCode(HttpStatus.OK)
  pay(@Param('id') id: string) {
    return this.billing.pay(id)
  }
}
