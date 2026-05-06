/*
  Warnings:

  - You are about to drop the column `agentId` on the `AgentItem` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `AgentItem` table. All the data in the column will be lost.
  - You are about to drop the column `specification` on the `AgentItem` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `SecretOrderItem` table. All the data in the column will be lost.
  - Added the required column `inventoryItemId` to the `SecretOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AgentItem" DROP CONSTRAINT "AgentItem_agentId_fkey";

-- DropForeignKey
ALTER TABLE "SecretOrderItem" DROP CONSTRAINT "SecretOrderItem_itemId_fkey";

-- DropIndex
DROP INDEX "AgentItem_agentId_isActive_idx";

-- AlterTable
ALTER TABLE "AgentItem" DROP COLUMN "agentId",
DROP COLUMN "price",
DROP COLUMN "specification";

-- AlterTable
ALTER TABLE "SecretOrderItem" DROP COLUMN "itemId",
ADD COLUMN     "inventoryItemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AgentInventoryItem" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "specification" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentInventoryItem_agentId_isActive_idx" ON "AgentInventoryItem"("agentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AgentInventoryItem_agentId_itemId_key" ON "AgentInventoryItem"("agentId", "itemId");

-- CreateIndex
CREATE INDEX "AgentItem_isActive_idx" ON "AgentItem"("isActive");

-- CreateIndex
CREATE INDEX "SecretOrderItem_inventoryItemId_idx" ON "SecretOrderItem"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "AgentInventoryItem" ADD CONSTRAINT "AgentInventoryItem_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInventoryItem" ADD CONSTRAINT "AgentInventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "AgentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretOrderItem" ADD CONSTRAINT "SecretOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "AgentInventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
