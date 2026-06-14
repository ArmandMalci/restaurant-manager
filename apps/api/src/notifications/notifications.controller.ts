import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { NotificationsService } from './notifications.service';
import type { SubscribeDtoClass } from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: this.svc.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: { id: string }, @Body() dto: SubscribeDtoClass) {
    return this.svc.subscribe(user.id, dto);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.svc.unsubscribe(body.endpoint)
    return { ok: true }
  }
}
