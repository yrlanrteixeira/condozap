-- Add is_internal column to complaint_messages table
ALTER TABLE "complaint_messages" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;