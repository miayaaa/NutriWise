-- AlterTable: add fiber column to food_logs for water-soluble fiber tracking
ALTER TABLE "food_logs" ADD COLUMN "fiber" DOUBLE PRECISION;
