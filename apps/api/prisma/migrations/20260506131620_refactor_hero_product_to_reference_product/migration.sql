/*
  Warnings:

  - You are about to drop the column `categoryId` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `mrp` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `replaceable` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `replaceablePeriod` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `returnable` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `returnablePeriod` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `specifications` on the `HeroProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[heroId,productId]` on the table `HeroProduct` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "HeroProduct" DROP CONSTRAINT "HeroProduct_categoryId_fkey";

-- DropIndex
DROP INDEX "HeroProduct_categoryId_idx";

-- AlterTable
ALTER TABLE "HeroProduct" DROP COLUMN "categoryId",
DROP COLUMN "description",
DROP COLUMN "imageUrl",
DROP COLUMN "mrp",
DROP COLUMN "name",
DROP COLUMN "replaceable",
DROP COLUMN "replaceablePeriod",
DROP COLUMN "returnable",
DROP COLUMN "returnablePeriod",
DROP COLUMN "specifications",
ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "HeroProduct_productId_idx" ON "HeroProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "HeroProduct_heroId_productId_key" ON "HeroProduct"("heroId", "productId");

-- AddForeignKey
ALTER TABLE "HeroProduct" ADD CONSTRAINT "HeroProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
