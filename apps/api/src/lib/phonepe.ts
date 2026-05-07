import crypto from "crypto";
import { env } from "../env";

const BASE_URL =
  env.PHONEPE_UAT !== "false"
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
    : "https://api.phonepe.com/apis/hermes";

function isConfigured(): boolean {
  return Boolean(env.PHONEPE_MERCHANT_ID && env.PHONEPE_SALT_KEY);
}

function xVerifyForPay(base64Payload: string): string {
  return (
    crypto
      .createHash("sha256")
      .update(base64Payload + "/pg/v1/pay" + env.PHONEPE_SALT_KEY)
      .digest("hex") +
    "###" +
    env.PHONEPE_SALT_INDEX
  );
}

function xVerifyForStatus(path: string): string {
  return (
    crypto
      .createHash("sha256")
      .update(path + env.PHONEPE_SALT_KEY)
      .digest("hex") +
    "###" +
    env.PHONEPE_SALT_INDEX
  );
}

export interface InitiateResult {
  success: boolean;
  redirectUrl: string;
}

export async function initiatePayment(params: {
  merchantTransactionId: string;
  merchantUserId: string;
  amountRupees: number;
  redirectUrl: string;
  callbackUrl: string;
}): Promise<InitiateResult> {
  if (!isConfigured()) {
    throw new Error("PhonePe is not configured");
  }

  const payload = {
    merchantId: env.PHONEPE_MERCHANT_ID,
    merchantTransactionId: params.merchantTransactionId,
    merchantUserId: params.merchantUserId,
    amount: Math.round(params.amountRupees * 100),
    redirectUrl: params.redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl: params.callbackUrl,
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

  const res = await fetch(`${BASE_URL}/pg/v1/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerifyForPay(base64Payload),
    },
    body: JSON.stringify({ request: base64Payload }),
  });

  const data = (await res.json()) as {
    success: boolean;
    data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
    message?: string;
  };

  if (!data.success) {
    throw new Error(data.message ?? "PhonePe initiation failed");
  }

  const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;
  if (!redirectUrl) throw new Error("PhonePe did not return a redirect URL");

  return { success: true, redirectUrl };
}

export async function getPaymentStatus(merchantTransactionId: string): Promise<{
  success: boolean;
  state: string;
  code: string;
  paymentInstrument?: { type: string; utr?: string };
}> {
  if (!isConfigured()) throw new Error("PhonePe is not configured");

  const path = `/pg/v1/status/${env.PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-VERIFY": xVerifyForStatus(path),
      "X-MERCHANT-ID": env.PHONEPE_MERCHANT_ID!,
    },
  });

  const data = (await res.json()) as {
    success: boolean;
    code: string;
    data?: { state: string; paymentInstrument?: { type: string; utr?: string } };
  };

  return {
    success: data.success,
    state: data.data?.state ?? "UNKNOWN",
    code: data.code,
    paymentInstrument: data.data?.paymentInstrument,
  };
}

export function verifyCallbackChecksum(
  base64Body: string,
  receivedChecksum: string
): boolean {
  if (!isConfigured()) return false;
  const expected =
    crypto
      .createHash("sha256")
      .update(base64Body + env.PHONEPE_SALT_KEY)
      .digest("hex") +
    "###" +
    env.PHONEPE_SALT_INDEX;
  return expected === receivedChecksum;
}
