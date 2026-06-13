import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { MenuModule } from './menu/menu.module'
import { TableModule } from './table/table.module'
import { OrderModule } from './order/order.module'
import { ReservationModule } from './reservation/reservation.module'
import { StaffModule } from './staff/staff.module'
import { ReportsModule } from './reports/reports.module'
import { SettingsModule } from './settings/settings.module'
import { BillingModule } from './billing/billing.module'
import { InventoryModule } from './inventory/inventory.module'
import { ShiftModule } from './shift/shift.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MenuModule,
    TableModule,
    OrderModule,
    ReservationModule,
    StaffModule,
    ReportsModule,
    SettingsModule,
    BillingModule,
    InventoryModule,
    ShiftModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
