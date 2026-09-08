-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('applied', 'interview', 'offer', 'rejected');

-- AlterTable: convert existing stage column values to enum safely
ALTER TABLE "Application" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "Application" ALTER COLUMN "stage" TYPE "ApplicationStage" USING (
  CASE lower("stage")
    WHEN 'applied' THEN 'applied'::"ApplicationStage"
    WHEN 'interview' THEN 'interview'::"ApplicationStage"
    WHEN 'offer' THEN 'offer'::"ApplicationStage"
    WHEN 'rejected' THEN 'rejected'::"ApplicationStage"
    ELSE 'applied'::"ApplicationStage"
  END
);

ALTER TABLE "Application" ALTER COLUMN "stage" SET DEFAULT 'applied'::"ApplicationStage";

