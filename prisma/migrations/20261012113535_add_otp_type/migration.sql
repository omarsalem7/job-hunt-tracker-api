-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- DropIndex
DROP INDEX "EmailVerificationOtp_email_idx";

-- AlterTable
ALTER TABLE "EmailVerificationOtp" ADD COLUMN     "type" "OtpType" NOT NULL DEFAULT 'EMAIL_VERIFICATION';

-- CreateIndex
CREATE INDEX "EmailVerificationOtp_email_type_idx" ON "EmailVerificationOtp"("email", "type");
