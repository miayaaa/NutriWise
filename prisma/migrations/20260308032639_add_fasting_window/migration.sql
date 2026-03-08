-- AlterTable
ALTER TABLE "users" ADD COLUMN     "fasting_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fasting_end" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "fasting_start" INTEGER NOT NULL DEFAULT 12;
