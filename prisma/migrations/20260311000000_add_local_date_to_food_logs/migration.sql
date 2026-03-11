-- AlterTable: add local_date column to food_logs for timezone-correct date grouping
ALTER TABLE "food_logs" ADD COLUMN "local_date" TEXT;
