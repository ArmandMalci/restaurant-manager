import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KdsController } from './kds.controller';
import { KdsService } from './kds.service';

@Module({
  imports: [PrismaModule],
  controllers: [KdsController],
  providers: [KdsService],
})
export class KdsModule {}
