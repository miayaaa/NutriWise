-- AlterTable
ALTER TABLE "users"
ADD COLUMN "height_cm" INTEGER,
ADD COLUMN "weight_goal_kg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "weight_logs"
ADD CONSTRAINT "weight_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
