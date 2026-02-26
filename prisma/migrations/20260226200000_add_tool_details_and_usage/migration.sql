-- AlterTable
ALTER TABLE "ResearchMessage" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "ResearchMessage" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "ResearchMessage" ADD COLUMN "costUsd" DOUBLE PRECISION;
ALTER TABLE "ResearchMessage" ADD COLUMN "toolCallsJson" JSONB;
ALTER TABLE "ResearchMessage" ADD COLUMN "citationsJson" JSONB;
