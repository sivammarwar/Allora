/*
  Warnings:

  - You are about to drop the column `customPrice` on the `HeroProduct` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `HeroProduct` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mrp` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `HeroProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "HeroProduct" DROP CONSTRAINT "HeroProduct_productId_fkey";

-- DropIndex
DROP INDEX "HeroProduct_heroId_productId_key";

-- DropIndex
DROP INDEX "HeroProduct_productId_idx";

-- AlterTable
ALTER TABLE "HeroProduct" DROP COLUMN "customPrice",
DROP COLUMN "productId",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "mrp" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "replaceable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replaceablePeriod" INTEGER,
ADD COLUMN     "returnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returnablePeriod" INTEGER,
ADD COLUMN     "sellingPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "specifications" JSONB;

-- CreateIndex
CREATE INDEX "HeroProduct_categoryId_idx" ON "HeroProduct"("categoryId");

-- CreateIndex
CREATE INDEX "HeroProduct_heroId_idx" ON "HeroProduct"("heroId");

-- AddForeignKey
ALTER TABLE "HeroProduct" ADD CONSTRAINT "HeroProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
