/*
  Warnings:

  - You are about to drop the column `isRefundable` on the `Subcategory` table. All the data in the column will be lost.
  - You are about to drop the column `isReplaceable` on the `Subcategory` table. All the data in the column will be lost.
  - You are about to drop the column `isReturnable` on the `Subcategory` table. All the data in the column will be lost.
  - You are about to drop the column `paymentCondition` on the `Subcategory` table. All the data in the column will be lost.
  - You are about to drop the column `returnWindowDays` on the `Subcategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subcategory" DROP COLUMN "isRefundable",
DROP COLUMN "isReplaceable",
DROP COLUMN "isReturnable",
DROP COLUMN "paymentCondition",
DROP COLUMN "returnWindowDays";
