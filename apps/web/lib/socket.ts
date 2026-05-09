"use client";

import { io, Socket } from "socket.io-client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const sockets = new Map<string, Socket>();

/**
 * Get (or lazily create) a Socket.io connection to a namespace.
 * Auth is via the existing access_token HTTP-only cookie (sent automatically).
 */
export function getSocket(namespace: "/notifications" | "/tracking" | "/service"): Socket {
  let s = sockets.get(namespace);
  if (s && s.connected) return s;
  s = io(`${API_URL}${namespace}`, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  sockets.set(namespace, s);
  return s;
}

export function disconnectAll() {
  sockets.forEach((s) => s.disconnect());
  sockets.clear();
}
