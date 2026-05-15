import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import { redis } from "./redis";

const OTP_TTL_MS = 10 * 60 * 1000;      // 10 minutes
const RATE_WINDOW_SEC = 15 * 60;        // 15 minutes
const RATE_LIMIT = 10;                  // max OTPs per email per window (increased for dev)

/** Generate a cryptographically random 6-digit OTP as a string. */
export function generateOtp(): string {
  // 0..999999 → zero-padded 6 digits
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

/**
 * Throws if the email has exceeded the OTP request rate limit.
 * Otherwise increments the counter (TTL-bound) and returns nothing.
 */
export async function assertOtpRateLimit(email: string): Promise<void> {
  try {
    const key = `otp:rate:${email.toLowerCase()}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_WINDOW_SEC);
    if (count > RATE_LIMIT) {
      const ttl = await redis.ttl(key);
      const err = new Error(
        `Too many OTP requests. Try again in ${Math.max(ttl, 1)}s.`
      );
      (err as any).status = 429;
      throw err;
    }
  } catch (e: any) {
    // If Redis is unavailable (e.g. local dev), skip rate limiting
    if (e.status === 429) throw e;
    console.warn("[otp] Redis unavailable, skipping rate limit:", e.message);
  }
}

/** Persists a hashed OTP and invalidates any prior unused ones for this email. */
export async function issueOtp(email: string): Promise<string> {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction([
    prisma.oTPRecord.updateMany({
      where: { email: email.toLowerCase(), used: false },
      data: { used: true },
    }),
    prisma.oTPRecord.create({
      data: { email: email.toLowerCase(), otpHash, expiresAt },
    }),
  ]);

  return otp;
}

/**
 * Verifies an OTP. On success, marks it used and returns true.
 * Returns false on any failure (wrong, expired, already used).
 */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const record = await prisma.oTPRecord.findFirst({
    where: { email: email.toLowerCase(), used: false },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  if (record.expiresAt.getTime() < Date.now()) return false;

  const ok = await bcrypt.compare(otp, record.otpHash);
  if (!ok) return false;

  await prisma.oTPRecord.update({
    where: { id: record.id },
    data: { used: true },
  });
  return true;
}
