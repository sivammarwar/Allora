import { Platform, PermissionsAndroid } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { api } from "./api";

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  // Android 13+
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export async function registerFCMToken(): Promise<void> {
  try {
    const granted = await requestPushPermission();
    console.log("[FCM] Permission granted:", granted);
    if (!granted) {
      console.log("[FCM] Permission not granted, skipping token registration");
      return;
    }
    const token = await messaging().getToken();
    console.log("[FCM] Token obtained:", token ? "YES" : "NO");
    if (token) {
      await api.post("/api/user/fcm-token", { token, platform: Platform.OS });
      console.log("[FCM] Token registered successfully");
    }
  } catch (error) {
    console.log("[FCM] Registration error:", error);
    // Non-fatal — don't block app startup
  }
}

/** Returns true if notifications are currently allowed (does NOT prompt). */
export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await messaging().hasPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result;
  }
  return true;
}

export function onForegroundNotification(
  handler: (title: string, body: string) => void
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? "";
    const body  = remoteMessage.notification?.body  ?? "";
    if (title || body) handler(title, body);
  });
}
