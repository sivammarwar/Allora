/*
  Warnings:

  - You are about to drop the column `categoryId` on the `HeroProfile` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "HeroProfile" DROP CONSTRAINT "HeroProfile_categoryId_fkey";

-- DropIndex
DROP INDEX "HeroProfile_categoryId_idx";

-- AlterTable
ALTER TABLE "HeroProfile" DROP COLUMN "categoryId",
ADD COLUMN     "categoryIds" TEXT[];
