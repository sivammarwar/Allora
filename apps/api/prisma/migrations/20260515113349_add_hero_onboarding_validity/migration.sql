-- AlterTable
ALTER TABLE "GlobalSetting" ADD COLUMN     "heroOnboardingValidityMonths" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "HeroProfile" ADD COLUMN     "onboardingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "onboardingFeePaid" INTEGER,
ADD COLUMN     "onboardingValidityMonths" INTEGER;
