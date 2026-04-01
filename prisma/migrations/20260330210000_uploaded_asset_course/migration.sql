-- AlterTable
ALTER TABLE "UploadedAsset" ADD COLUMN "courseId" TEXT;

-- CreateIndex
CREATE INDEX "UploadedAsset_courseId_kind_idx" ON "UploadedAsset"("courseId", "kind");

-- AddForeignKey
ALTER TABLE "UploadedAsset" ADD CONSTRAINT "UploadedAsset_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
