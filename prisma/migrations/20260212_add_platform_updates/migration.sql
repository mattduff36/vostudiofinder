-- CreateEnum
CREATE TYPE "PlatformUpdateCategory" AS ENUM ('FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY');

-- CreateTable
CREATE TABLE "platform_updates" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "category" "PlatformUpdateCategory" NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "is_highlighted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_updates_release_date_idx" ON "platform_updates"("release_date");
