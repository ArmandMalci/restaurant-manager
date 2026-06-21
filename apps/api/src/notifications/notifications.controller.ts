import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { SubscribeDtoClass } from './dto/notification.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  public constructor(private readonly svc: NotificationsService) {}

  @Get('vapid-public-key')
  public getPublicKey() {
    return { publicKey: this.svc.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: SubscribeDtoClass })
  public subscribe(@CurrentUser() user: { id: string }, @Body() dto: SubscribeDtoClass) {
    return this.svc.subscribe(user.id, dto);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: { endpoint: { type: 'string', format: 'uri' } },
      required: ['endpoint'],
    },
  })
  public async unsubscribe(@Body() body: { endpoint: string }) {
    await this.svc.unsubscribe(body.endpoint);

    return { ok: true };
  }
}
