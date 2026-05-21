import http from "http";
import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { env, isProd } from "./env";
import { logger } from "./lib/logger";
import { generalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFound } from "./middleware/error";
import apiRouter from "./routes";
import { initSocket } from "./socket";
import { redis } from "./lib/redis";
import { prisma, connectDB } from "./lib/prisma";

const app = express();

app.set("trust proxy", 1);

// ── Compression ───────────────────────────────────────────
app.use(compression());

// ── Security ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: isProd ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
const allowedOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Body / cookies ────────────────────────────────────────
// Razorpay webhook must read the raw body for signature verification —
// reserve it before the JSON parser. The webhook route is registered
// in a later pass; the verify hook is already exported in lib/razorpay.
app.use(
  express.json({
    limit: "1mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── Request timeout ───────────────────────────────────────
// Increase timeout for image uploads (2 minutes)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/upload")) {
    res.setTimeout(120000); // 2 minutes for uploads
  } else {
    res.setTimeout(30000); // 30 seconds for other requests
  }
  next();
});

// ── Logging ───────────────────────────────────────────────
app.use((req, _res, next) => {
  if (req.path !== "/api/health" && req.path !== "/") {
    logger.info(`${req.method} ${req.path}`);
  }
  next();
});

// ── Rate limiting (general) ───────────────────────────────
app.use(generalLimiter);

// ── Health check (root) for ALB default health checks ────
app.get("/", (_req, res) => res.status(200).json({ ok: true }));

// ── Routes ────────────────────────────────────────────────
app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

// ── HTTP + Socket.io server ───────────────────────────────
const server = http.createServer(app);
initSocket(server);

const port = env.PORT;
connectDB()
  .then(() => {
    server.listen(port, () => {
      logger.info(`Bharat Services API ready → http://localhost:${port} (${env.NODE_ENV})`);
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to database after retries:", err);
    process.exit(1);
  });

// ── Graceful shutdown ─────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down…`);
  server.close();
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
