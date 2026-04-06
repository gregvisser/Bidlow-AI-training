-- Phase 1F: lightweight assessment fields, enrollment completion summary, certificate eligibility

ALTER TABLE "Course" ADD COLUMN "certificateEligible" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Lesson" ADD COLUMN "checkpointPrompt" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "exerciseRequiredForCompletion" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN "checkpointRequiredForCompletion" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LessonProgress" ADD COLUMN "exerciseAcknowledgedAt" TIMESTAMP(3);
ALTER TABLE "LessonProgress" ADD COLUMN "checkpointAcknowledgedAt" TIMESTAMP(3);

ALTER TABLE "Enrollment" ADD COLUMN "courseCompletedAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN "lessonsCompletedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Enrollment" ADD COLUMN "minutesCompletedEstimate" INTEGER NOT NULL DEFAULT 0;
