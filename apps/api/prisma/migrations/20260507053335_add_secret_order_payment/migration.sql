-- CreateEnum
CREATE TYPE "SecretOrderPaymentMode" AS ENUM ('COD', 'ONLINE');

-- CreateEnum
CREATE TYPE "SecretOrderPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "SecretOrder" ADD COLUMN     "paymentMode" "SecretOrderPaymentMode" NOT NULL DEFAULT 'COD',
ADD COLUMN     "paymentStatus" "SecretOrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paymentTxnId" TEXT;
