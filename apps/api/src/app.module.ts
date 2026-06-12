import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { MenuModule } from './menu/menu.module'
import { TableModule } from './table/table.module'
import { OrderModule } from './order/order.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MenuModule,
    TableModule,
    OrderModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
