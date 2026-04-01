-- AlterTable
ALTER TABLE "Course" ADD COLUMN "pricingModel" TEXT DEFAULT 'included';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Enrollment_userId_lastActivityAt_idx" ON "Enrollment"("userId", "lastActivityAt");
