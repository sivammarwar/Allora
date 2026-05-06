import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../env";

let client: Razorpay | null = null;

export function getRazorpay(): Razorpay | null {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

/**
 * Verify Razorpay webhook signature.
 * Throws if invalid; returns the parsed body if valid.
 */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay webhook secret not configured");
  }
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const ok =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!ok) throw new Error("Invalid webhook signature");
  return JSON.parse(rawBody);
}

/** Verify a Razorpay payment signature (for checkout success callback). */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  if (!env.RAZORPAY_KEY_SECRET) throw new Error("Razorpay not configured");
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
