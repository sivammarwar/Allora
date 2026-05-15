import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import cookie from "cookie";
import { verifyAccessToken } from "../lib/jwt";
import { env } from "../env";
import { logger } from "../lib/logger";
import { createRedisClient } from "../lib/redis";

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer): IOServer {
  const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim());
  io = new IOServer(httpServer, {
    cors: {
      // Allow web origins AND React Native (no Origin header → origin is undefined/null)
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Socket CORS: ${origin} not allowed`));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Redis adapter — required for horizontal scaling (multiple API instances)
  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  logger.info("[socket] Redis adapter attached");

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

  // ─── /service namespace ───────────────────────────────────────────────────
  // Auth is OPTIONAL here: authenticated users get user/hero rooms,
  // but unauthenticated guests can still join slot rooms for real-time availability.
  const nService = io.of("/service");
  nService.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const parsed = cookie.parse(cookieHeader);
      const token =
        parsed.access_token ||
        (socket.handshake.auth?.token as string | undefined);
      if (token) {
        const payload = verifyAccessToken(token);
        (socket.data as any).user = {
          id: payload.sub,
          role: payload.role,
          email: payload.email,
        };
      }
    } catch {
      // Invalid / missing token — allow as guest (slots:watch still works)
    }
    next();
  });
  nService.on("connection", (socket) => {
    const u = (socket.data as any).user;
    console.log("[Socket] /service connection:", u ? `user=${u.id} role=${u.role}` : "guest");
    // Authenticated users join their personal room for booking notifications
    if (u) {
      socket.join(`user:${u.id}`);
      console.log("[Socket] User joined room:", `user:${u.id}`);
    }

    // Hero joins their hero room to receive booking broadcasts (auth required)
    socket.on("hero:join", (heroId: string) => {
      if (!u) return;
      if (typeof heroId === "string" && heroId.length) {
        socket.join(`hero:${heroId}`);
        console.log("[Socket] Hero joined room:", `hero:${heroId}`);
      }
    });

    // Users/heroes watch slots for a subcategory (for real-time availability)
    // No auth required — guests browsing the booking page need this too.
    socket.on("slots:watch", (key: string) => {
      if (typeof key === "string" && key.length) {
        socket.join(`slots:${key}`);
      }
    });
    socket.on("slots:unwatch", (key: string) => {
      if (typeof key === "string") socket.leave(`slots:${key}`);
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

/** Emit a notification event to a specific user via /notifications namespace. */
export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  io.of("/notifications").to(`user:${userId}`).emit(event, data);
}

/** Emit a service event to a specific user or hero via /service namespace. */
export function emitService(room: string, event: string, data: unknown) {
  if (!io) return;
  console.log("[Socket] Emitting to room:", room, "event:", event);
  io.of("/service").to(room).emit(event, data);
}
