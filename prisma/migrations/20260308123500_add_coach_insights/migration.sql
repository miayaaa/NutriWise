-- CreateTable
CREATE TABLE "coach_insights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "range_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "coach_comment" TEXT NOT NULL,
    "action_items" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_insights_user_id_range_type_start_date_end_date_key"
ON "coach_insights"("user_id", "range_type", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "coach_insights"
ADD CONSTRAINT "coach_insights_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
