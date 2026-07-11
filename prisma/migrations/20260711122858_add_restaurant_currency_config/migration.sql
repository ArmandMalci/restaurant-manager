-- AlterTable
ALTER TABLE "restaurant_settings" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "exchangeRates" JSONB NOT NULL DEFAULT '{}';
