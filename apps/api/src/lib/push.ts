import admin from "firebase-admin";
import { env } from "../env";
import { prisma } from "./prisma";
import { logger } from "./logger";

let fcmApp: admin.app.App | null = null;

function getFCMApp(): admin.app.App | null {
  if (fcmApp) return fcmApp;
  console.log("[push] Checking FCM credentials...");
  console.log("[push] FCM_PROJECT_ID:", env.FCM_PROJECT_ID ? "SET" : "NOT SET");
  console.log("[push] FCM_PRIVATE_KEY:", env.FCM_PRIVATE_KEY ? "SET" : "NOT SET");
  console.log("[push] FCM_CLIENT_EMAIL:", env.FCM_CLIENT_EMAIL ? "SET" : "NOT SET");
  if (!env.FCM_PROJECT_ID || !env.FCM_PRIVATE_KEY || !env.FCM_CLIENT_EMAIL) {
    logger.warn("[push] FCM credentials not configured — push notifications disabled");
    return null;
  }
  try {
    fcmApp = admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: env.FCM_PROJECT_ID,
          privateKey: env.FCM_PRIVATE_KEY.replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
          clientEmail: env.FCM_CLIENT_EMAIL,
        }),
      },
      "fcm"
    );
    logger.info("[push] Firebase Admin initialized");
    console.log("[push] Firebase Admin initialized successfully");
    return fcmApp;
  } catch (e) {
    logger.error("[push] Failed to initialize Firebase Admin:", e);
    console.log("[push] Firebase Admin initialization failed:", e);
    fcmApp = null;
    return null;
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  console.log("[push] Sending notification to user:", userId, "title:", title);
  const app = getFCMApp();
  if (!app) {
    console.log("[push] Firebase Admin not initialized, skipping notification");
    return;
  }

  const tokens = await prisma.fcmToken.findMany({
    where: { userId },
    select: { token: true },
  });

  console.log("[push] Found", tokens.length, "tokens for user:", userId);

  if (tokens.length === 0) {
    logger.info(`[push] No FCM tokens for user ${userId}`);
    return;
  }

  // Send to each token individually (sendMulticast API changed in v12+)
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  for (const { token } of tokens) {
    const message: admin.messaging.TokenMessage = {
      notification: { title, body },
      data: data ? { ...data, title, body } : { title, body },
      token,
      android: {
        priority: "high",        // Wake the device from Doze mode — critical for delivery
        notification: {
          sound: "default",
          channelId: "default",
          priority: "max",       // Show as heads-up banner (slides down from top)
          defaultVibrateTimings: true,
          defaultSound: true,
          visibility: "public",  // Show on lock screen
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    try {
      await app.messaging().send(message);
      console.log("[push] Successfully sent to token:", token.substring(0, 20) + "...");
      successCount++;
    } catch (e: any) {
      failureCount++;
      console.log("[push] Failed to send to token:", e.code, e.message);
      if (e.code === "messaging/registration-token-not-registered") {
        invalidTokens.push(token);
      }
    }
  }

  logger.info(`[push] Sent to ${tokens.length} tokens, ${successCount} success, ${failureCount} failed`);

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    await prisma.fcmToken.deleteMany({
      where: { token: { in: invalidTokens } },
    });
    logger.info(`[push] Cleaned up ${invalidTokens.length} invalid FCM tokens`);
  }
}
