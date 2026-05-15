-- AlterTable
ALTER TABLE "GlobalSetting" ADD COLUMN     "heroOnboardingFee" INTEGER NOT NULL DEFAULT 999;

-- AlterTable
ALTER TABLE "HeroProfile" ADD COLUMN     "hasPaidOnboardingFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingPaidAt" TIMESTAMP(3),
ADD COLUMN     "onboardingPaymentTxnId" TEXT;
