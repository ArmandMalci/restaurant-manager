import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import webpush from 'web-push';
import type { SubscribeDto } from '@restaurant/shared';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY', '');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@restaurant.local');
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidReady = true;
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '');
  }

  async subscribe(staffId: string, dto: SubscribeDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        staffId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        staffId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToRole(role: string, payload: { title: string; body: string }): Promise<void> {
    if (!this.vapidReady) {
      this.logger.debug('Push skipped — VAPID not configured');
      return;
    }
    const subs = await this.prisma.pushSubscription.findMany({
      where: { staff: { role: role as never } },
    });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch((err: unknown) =>
            this.logger.warn(`Push failed [${sub.endpoint.slice(0, 40)}…]: ${String(err)}`),
          ),
      ),
    );
  }

  async sendToStaff(staffId: string, payload: { title: string; body: string }): Promise<void> {
    if (!this.vapidReady) {
      this.logger.debug('Push skipped — VAPID not configured');
      return;
    }
    const subs = await this.prisma.pushSubscription.findMany({ where: { staffId } });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          )
          .catch((err: unknown) =>
            this.logger.warn(`Push failed [${sub.endpoint.slice(0, 40)}…]: ${String(err)}`),
          ),
      ),
    );
  }
}
