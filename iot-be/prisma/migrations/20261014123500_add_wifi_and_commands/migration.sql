-- AlterEnum
ALTER TYPE "CommandType" ADD VALUE 'UPDATE_WIFI';

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "wifiSsid" TEXT;

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN "wifiSsid" TEXT;
