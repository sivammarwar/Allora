import Redis from "ioredis";
import { env } from "../env";

/**
 * Two clients:
 *  - `redis`     : general commands (cache, OTP, counters)
 *  - `pubClient` / `subClient` : socket.io adapter (created lazily by socket layer)
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[redis] error:", err.message);
});

export const createRedisClient = () =>
  new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
