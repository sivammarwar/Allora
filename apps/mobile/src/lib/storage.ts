import EncryptedStorage from "react-native-encrypted-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Sensitive keys (tokens) use EncryptedStorage (Android Keystore / iOS Keychain).
 *  Non-sensitive keys fall back to AsyncStorage. */
const SENSITIVE = new Set(["access_token", "refresh_token"]);

export const storage = {
  get: async (key: string) => {
    try {
      if (SENSITIVE.has(key)) return await EncryptedStorage.getItem(key);
      return await AsyncStorage.getItem(key);
    } catch { return null; }
  },
  set: async (key: string, value: string) => {
    try {
      if (SENSITIVE.has(key)) await EncryptedStorage.setItem(key, value);
      else await AsyncStorage.setItem(key, value);
    } catch {}
  },
  remove: async (key: string) => {
    try {
      if (SENSITIVE.has(key)) await EncryptedStorage.removeItem(key);
      else await AsyncStorage.removeItem(key);
    } catch {}
  },
  getJSON: async <T>(key: string): Promise<T | null> => {
    try {
      const v = SENSITIVE.has(key)
        ? await EncryptedStorage.getItem(key)
        : await AsyncStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  setJSON: async (key: string, value: unknown) => {
    try {
      const s = JSON.stringify(value);
      if (SENSITIVE.has(key)) await EncryptedStorage.setItem(key, s);
      else await AsyncStorage.setItem(key, s);
    } catch {}
  },
};
