/*
  Warnings:

  - You are about to drop the column `transportChargePerKm` on the `AgentSubcategoryPricing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AgentSubcategoryPricing" DROP COLUMN "transportChargePerKm";

-- CreateTable
CREATE TABLE "AgentCategoryConfig" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "transportChargePerKm" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bulkDiscount2" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "bulkDiscount3" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "bulkDiscount4Plus" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentCategoryConfig_agentId_idx" ON "AgentCategoryConfig"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCategoryConfig_agentId_categoryId_key" ON "AgentCategoryConfig"("agentId", "categoryId");

-- AddForeignKey
ALTER TABLE "AgentCategoryConfig" ADD CONSTRAINT "AgentCategoryConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCategoryConfig" ADD CONSTRAINT "AgentCategoryConfig_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
