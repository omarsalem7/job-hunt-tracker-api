-- DropIndex
DROP INDEX "Application_userId_idx";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "lastFollowUpAt" TIMESTAMP(3),
ADD COLUMN     "snoozeFollowUpUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Application_userId_stage_idx" ON "Application"("userId", "stage");
