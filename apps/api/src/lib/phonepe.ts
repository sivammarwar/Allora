import { env } from "../env";

const BASE_URL =
  env.PHONEPE_UAT !== "false"
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
    : "https://api.phonepe.com/apis/pg";

function isConfigured(): boolean {
  return Boolean(env.PHONEPE_CLIENT_ID && env.PHONEPE_CLIENT_SECRET);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.PHONEPE_CLIENT_ID!,
    client_secret: env.PHONEPE_CLIENT_SECRET!,
    client_version: env.PHONEPE_CLIENT_VERSION,
  });

  const res = await fetch(`${BASE_URL}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!data.access_token) {
    throw new Error(`PhonePe token error: ${data.error ?? "unknown"}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  };

  return cachedToken.token;
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
  if (!isConfigured()) throw new Error("PhonePe is not configured");

  const token = await getAccessToken();

  const payload = {
    merchantOrderId: params.merchantTransactionId,
    amount: Math.round(params.amountRupees * 100),
    expireAfter: 1200,
    returnUrl: params.redirectUrl,
    notificationUrl: params.callbackUrl,
    paymentFlow: {
      type: "PG_CHECKOUT",
      message: "Order payment",
      merchantUserId: params.merchantUserId,
    },
  };

  const res = await fetch(`${BASE_URL}/checkout/v2/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    redirectUrl?: string;
    orderId?: string;
    state?: string;
    message?: string;
  };

  if (!data.redirectUrl) {
    throw new Error(data.message ?? "PhonePe did not return a redirect URL");
  }

  return { success: true, redirectUrl: data.redirectUrl };
}

export async function getPaymentStatus(merchantOrderId: string): Promise<{
  success: boolean;
  state: string;
  code: string;
}> {
  if (!isConfigured()) throw new Error("PhonePe is not configured");

  const token = await getAccessToken();

  const res = await fetch(
    `${BASE_URL}/checkout/v2/order/${merchantOrderId}/status`,
    {
      headers: { Authorization: `O-Bearer ${token}` },
    }
  );

  const data = (await res.json()) as {
    state?: string;
    paymentDetails?: { state?: string }[];
    message?: string;
  };

  const state = data.state ?? "UNKNOWN";
  const success = state === "COMPLETED";

  return { success, state, code: state };
}

export async function verifyCallbackToken(authHeader: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const token = authHeader.replace(/^O-Bearer\s+/i, "");
    const res = await fetch(`${BASE_URL}/v1/oauth/token/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
