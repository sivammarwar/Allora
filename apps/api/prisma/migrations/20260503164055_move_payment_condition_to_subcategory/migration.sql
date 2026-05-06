/*
  Warnings:

  - You are about to drop the column `paymentCondition` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "paymentCondition";

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "paymentCondition" "PaymentCondition" NOT NULL DEFAULT 'FIXED';
