import { io, Socket } from "socket.io-client";
import { API_URL } from "./config";
import { storage } from "./storage";

let notifSocket: Socket | null = null;
let notifToken: string | null = null;

let serviceSocket: Socket | null = null;
let serviceToken: string | null = null;

async function getToken() {
  return (await storage.get("access_token")) ?? "";
}

export async function connectNotifications() {
  const token = await getToken();
  // Reconnect if token changed (login/logout) or socket dropped
  if (notifSocket?.connected && notifToken === token) return notifSocket;
  if (notifSocket) { notifSocket.disconnect(); notifSocket = null; }
  notifToken = token;
  notifSocket = io(`${API_URL}/notifications`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  return notifSocket;
}

export async function connectService() {
  const token = await getToken();
  // Reconnect if token changed (login/logout) or socket dropped
  if (serviceSocket?.connected && serviceToken === token) return serviceSocket;
  if (serviceSocket) { serviceSocket.disconnect(); serviceSocket = null; }
  serviceToken = token;
  serviceSocket = io(`${API_URL}/service`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  return serviceSocket;
}

export function disconnectAll() {
  notifSocket?.disconnect();
  serviceSocket?.disconnect();
  notifSocket = null;
  serviceSocket = null;
  notifToken = null;
  serviceToken = null;
}
