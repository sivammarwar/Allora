import { prisma } from "./prisma";

/**
 * Compute expiry by adding `months` to `fromDate`. Uses calendar months
 * (e.g. Feb 28 + 1 month → Mar 28). If the resulting day overflows, JS Date
 * normalizes it (e.g. Jan 31 + 1 month → Mar 3); we accept that.
 */
export function addMonths(fromDate: Date, months: number): Date {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Mark a hero as having paid the onboarding fee. Snapshots the CURRENT fee +
 * validity from GlobalSetting at this moment, so future admin changes do not
 * retroactively alter this hero's expiry. Idempotent on second call (will
 * extend expiry from new "now").
 */
export async function markHeroOnboardingPaid(
  heroProfileId: string,
  opts?: { txnId?: string; markedBy?: "PHONEPE" | "AGENT" | "ADMIN" }
) {
  const settings = await prisma.globalSetting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  const paidAt = new Date();
  const validityMonths = settings.heroOnboardingValidityMonths;
  const expiresAt = addMonths(paidAt, validityMonths);
  return prisma.heroProfile.update({
    where: { id: heroProfileId },
    data: {
      hasPaidOnboardingFee: true,
      onboardingPaidAt: paidAt,
      onboardingExpiresAt: expiresAt,
      onboardingFeePaid: settings.heroOnboardingFee,
      onboardingValidityMonths: validityMonths,
      ...(opts?.txnId && { onboardingPaymentTxnId: opts.txnId }),
    },
  });
}

/**
 * Mark a hero as UNPAID (revoke onboarding access). Used by agents/admins
 * for manual corrections.
 */
export async function markHeroOnboardingUnpaid(heroProfileId: string) {
  return prisma.heroProfile.update({
    where: { id: heroProfileId },
    data: {
      hasPaidOnboardingFee: false,
      onboardingPaidAt: null,
      onboardingExpiresAt: null,
      onboardingFeePaid: null,
      onboardingValidityMonths: null,
    },
  });
}
