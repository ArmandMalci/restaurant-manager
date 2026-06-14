import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { UpdateSettingsDto } from '@restaurant/shared';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async get() {
    return this.prisma.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  public async update(dto: UpdateSettingsDto) {
    return this.prisma.restaurantSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...dto },
      update: dto,
    });
  }
}
