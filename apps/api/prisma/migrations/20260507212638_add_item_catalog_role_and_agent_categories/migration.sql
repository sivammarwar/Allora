-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ITEM_CATALOG';

-- AlterTable
ALTER TABLE "AgentItem" ADD COLUMN     "buyCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "AgentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCategory_isActive_idx" ON "AgentCategory"("isActive");

-- CreateIndex
CREATE INDEX "AgentItem_categoryId_idx" ON "AgentItem"("categoryId");

-- AddForeignKey
ALTER TABLE "AgentItem" ADD CONSTRAINT "AgentItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AgentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
