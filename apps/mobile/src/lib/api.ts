import axios from "axios";
import { API_URL } from "./config";
import { storage } from "./storage";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 30000,
});

// Attach access token from storage on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log("[API] Request:", config.method?.toUpperCase(), config.baseURL + config.url,
    "hasToken:", !!token, "tokenLen:", token?.length);
  return config;
});

// On 401 try to refresh, then retry once
apiClient.interceptors.response.use(
  (r) => r.data,
  async (error) => {
    console.log("[API] Response error:", JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    }));
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await storage.get("refresh_token");
        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken: refresh });
        const { accessToken } = res.data;
        await storage.set("access_token", accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        await storage.remove("access_token");
        await storage.remove("refresh_token");
      }
    }
    return Promise.reject(error.response?.data ?? error);
  }
);

export const api = {
  get:    (url: string, params?: object) => apiClient.get(url, { params }),
  post:   (url: string, data?: object)  => apiClient.post(url, data),
  patch:  (url: string, data?: object)  => apiClient.patch(url, data),
  put:    (url: string, data?: object)  => apiClient.put(url, data),
  delete: (url: string)                 => apiClient.delete(url),
};
