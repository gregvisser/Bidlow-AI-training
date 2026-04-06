-- Launch curriculum ownership: only rows tagged with this source are updated by curriculum:sync
ALTER TABLE "LearningPath" ADD COLUMN "catalogSource" TEXT;
ALTER TABLE "Course" ADD COLUMN "catalogSource" TEXT;
ALTER TABLE "Module" ADD COLUMN "catalogSource" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "catalogSource" TEXT;
ALTER TABLE "LessonResourceLink" ADD COLUMN "catalogSource" TEXT;

CREATE INDEX "Course_catalogSource_idx" ON "Course"("catalogSource");
CREATE INDEX "LearningPath_catalogSource_idx" ON "LearningPath"("catalogSource");
