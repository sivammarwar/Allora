import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import cookie from "cookie";
import { verifyAccessToken } from "../lib/jwt";
import { env } from "../env";
import { logger } from "../lib/logger";

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    transports: ["websocket", "polling"],
  });

  // Auth middleware — runs at handshake time on every namespace
  const authMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const parsed = cookie.parse(cookieHeader);
      const token =
        parsed.access_token ||
        (socket.handshake.auth?.token as string | undefined);
      if (!token) return next(new Error("Unauthenticated"));
      const payload = verifyAccessToken(token);
      (socket.data as any).user = {
        id: payload.sub,
        role: payload.role,
        email: payload.email,
      };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  };

  // ─── /notifications namespace ──────────────────────────────────────────
  const nNotif = io.of("/notifications");
  nNotif.use(authMiddleware);
  nNotif.on("connection", (socket) => {
    const u = (socket.data as any).user;
    socket.join(`user:${u.id}`);
    logger.info(`[socket/notifications] connected user=${u.id}`);
    socket.on("disconnect", () => {
      logger.info(`[socket/notifications] disconnected user=${u.id}`);
    });
  });

  // ─── /tracking namespace ──────────────────────────────────────────────
  const nTrack = io.of("/tracking");
  nTrack.use(authMiddleware);
  nTrack.on("connection", (socket) => {
    const u = (socket.data as any).user;

    // User watches an order → joins that order's room
    socket.on("track:join", (orderId: string) => {
      if (typeof orderId === "string" && orderId.length) {
        socket.join(`order:${orderId}`);
      }
    });
    socket.on("track:leave", (orderId: string) => {
      if (typeof orderId === "string") socket.leave(`order:${orderId}`);
    });

    // Delivery boy emits location → broadcast to order room
    socket.on(
      "delivery:location",
      (payload: { orderId: string; lat: number; lng: number }) => {
        if (
          u.role !== "DELIVERY_BOY" ||
          typeof payload?.orderId !== "string" ||
          typeof payload?.lat !== "number" ||
          typeof payload?.lng !== "number"
        ) {
          return;
        }
        nTrack.to(`order:${payload.orderId}`).emit("delivery:location_update", {
          orderId: payload.orderId,
          lat: payload.lat,
          lng: payload.lng,
          ts: Date.now(),
        });
      }
    );
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

/** Emit a notification event to a specific user across both namespaces. */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  io.of("/notifications").to(`user:${userId}`).emit(event, data);
}
