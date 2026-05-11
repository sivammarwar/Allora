/*
  Warnings:

  - You are about to drop the column `subcategoryId` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,categoryId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_heroId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_subcategoryId_fkey";

-- DropIndex
DROP INDEX "Review_subcategoryId_createdAt_idx";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "subcategoryId",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "heroId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "newlyAddedPosition" INTEGER;

-- CreateTable
CREATE TABLE "BookingRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReaction" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRating_serviceRequestId_key" ON "BookingRating"("serviceRequestId");

-- CreateIndex
CREATE INDEX "BookingRating_categoryId_createdAt_idx" ON "BookingRating"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRating_userId_categoryId_idx" ON "BookingRating"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "ReviewReaction_reviewId_idx" ON "ReviewReaction"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewReaction_userId_idx" ON "ReviewReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReaction_reviewId_userId_key" ON "ReviewReaction"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "Review_categoryId_createdAt_idx" ON "Review"("categoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_categoryId_key" ON "Review"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_heroId_fkey" FOREIGN KEY ("heroId") REFERENCES "HeroProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRating" ADD CONSTRAINT "BookingRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRating" ADD CONSTRAINT "BookingRating_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRating" ADD CONSTRAINT "BookingRating_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReaction" ADD CONSTRAINT "ReviewReaction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReaction" ADD CONSTRAINT "ReviewReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
