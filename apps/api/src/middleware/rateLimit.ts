import rateLimit from "express-rate-limit";

/** General API limiter — 100 req / 15 min per IP. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});

/** Strict auth limiter — 20 req / 15 min per IP (used in addition to per-email OTP rate limit).
 *  NOTE: Increased for development. Use 5 req/min for production.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Try again later." },
});
