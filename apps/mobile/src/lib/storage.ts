import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  get: async (key: string) => {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  set: async (key: string, value: string) => {
    try { await AsyncStorage.setItem(key, value); } catch {}
  },
  remove: async (key: string) => {
    try { await AsyncStorage.removeItem(key); } catch {}
  },
  getJSON: async <T>(key: string): Promise<T | null> => {
    try {
      const v = await AsyncStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  setJSON: async (key: string, value: unknown) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
