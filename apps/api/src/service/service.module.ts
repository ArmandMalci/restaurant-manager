import { Module } from '@nestjs/common';
import { ServiceSnapshotService } from './service-snapshot.service';
import { ServiceController } from './service.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [ServiceSnapshotService],
  controllers: [ServiceController],
})
export class ServiceModule {}
