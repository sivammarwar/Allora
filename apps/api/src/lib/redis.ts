import Redis from "ioredis";
import { env } from "../env";

/**
 * Two clients:
 *  - `redis`     : general commands (cache, OTP, counters)
 *  - `pubClient` / `subClient` : socket.io adapter (created lazily by socket layer)
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 0,     // fail fast — callers handle errors gracefully
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: () => 3000,   // reconnect every 3s but don't block commands
});

redis.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[redis] error:", err.message);
});

export const createRedisClient = () =>
  new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
