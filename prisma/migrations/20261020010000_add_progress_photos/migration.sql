-- CreateTable
CREATE TABLE "progress_photos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "local_date" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "progress_photos_pathname_key" ON "progress_photos"("pathname");

-- CreateIndex
CREATE INDEX "progress_photos_user_id_local_date_idx" ON "progress_photos"("user_id", "local_date");

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

