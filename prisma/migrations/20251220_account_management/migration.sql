-- AlterTable
ALTER TABLE "users" ADD COLUMN "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN "deletion_scheduled_for" TIMESTAMP(3),
ADD COLUMN "deletion_status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('ISSUE', 'SUGGESTION');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "SupportTicketType" NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX "support_tickets_type_idx" ON "support_tickets"("type");
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

