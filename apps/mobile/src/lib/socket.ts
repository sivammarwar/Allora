import { io, Socket } from "socket.io-client";
import { API_URL } from "./config";
import { storage } from "./storage";

let notifSocket: Socket | null = null;
let serviceSocket: Socket | null = null;

async function getToken() {
  return (await storage.get("access_token")) ?? "";
}

export async function connectNotifications() {
  if (notifSocket?.connected) return notifSocket;
  const token = await getToken();
  notifSocket = io(`${API_URL}/notifications`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
  });
  return notifSocket;
}

export async function connectService() {
  if (serviceSocket?.connected) return serviceSocket;
  const token = await getToken();
  serviceSocket = io(`${API_URL}/service`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
  });
  return serviceSocket;
}

export function disconnectAll() {
  notifSocket?.disconnect();
  serviceSocket?.disconnect();
  notifSocket = null;
  serviceSocket = null;
}
