-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "firedAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "servedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "seatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "seatedAt" TIMESTAMP(3);
