-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viralPosition" INTEGER;

-- CreateIndex
CREATE INDEX "Subcategory_isPinned_viralPosition_idx" ON "Subcategory"("isPinned", "viralPosition");
