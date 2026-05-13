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
    if (!granted) return;
    const token = await messaging().getToken();
    if (token) {
      await api.post("/api/user/fcm-token", { token, platform: Platform.OS });
    }
  } catch {
    // Non-fatal — don't block app startup
  }
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
