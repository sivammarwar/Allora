-- AlterTable
ALTER TABLE "SecretOrderItem" ADD COLUMN     "isPacked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRejected" BOOLEAN NOT NULL DEFAULT false;
