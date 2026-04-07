-- CreateEnum
CREATE TYPE "LearningOutcomeType" AS ENUM ('PLATFORM_CERTIFICATE', 'PROVIDER_CERTIFICATE', 'PROVIDER_EXAM_PREP', 'PROVIDER_ALIGNED');

-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN "outcomeType" "LearningOutcomeType" NOT NULL DEFAULT 'PROVIDER_ALIGNED';
ALTER TABLE "LearningPath" ADD COLUMN "outcomeSummary" TEXT;
ALTER TABLE "LearningPath" ADD COLUMN "providerCertificationUrl" TEXT;
ALTER TABLE "LearningPath" ADD COLUMN "providerCertificationMapping" TEXT;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "outcomeType" "LearningOutcomeType" NOT NULL DEFAULT 'PLATFORM_CERTIFICATE';
ALTER TABLE "Course" ADD COLUMN "outcomeSummary" TEXT;
ALTER TABLE "Course" ADD COLUMN "providerCertificationUrl" TEXT;
ALTER TABLE "Course" ADD COLUMN "providerCertificationMapping" TEXT;
