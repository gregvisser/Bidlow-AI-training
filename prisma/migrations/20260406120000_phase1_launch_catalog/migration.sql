-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "badgeLabel" TEXT,
ADD COLUMN     "difficulty" TEXT;

-- CreateIndex
CREATE INDEX "LearningPath_isPublic_sortOrder_idx" ON "LearningPath"("isPublic", "sortOrder");

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "learningObjectives" TEXT,
ADD COLUMN     "exerciseTask" TEXT,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "badgeLabel" TEXT;

-- CreateTable
CREATE TABLE "LessonResourceLink" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceProvider" "ContentProvider",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonResourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonResourceLink_lessonId_sortOrder_idx" ON "LessonResourceLink"("lessonId", "sortOrder");

-- AddForeignKey
ALTER TABLE "LessonResourceLink" ADD CONSTRAINT "LessonResourceLink_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
