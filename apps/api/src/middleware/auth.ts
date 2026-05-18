import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";

/** Reads the access token from the HTTP-only cookie or Authorization header. */
function extractToken(req: Request): string | null {
  const cookieToken = (req as any).cookies?.access_token;
  if (cookieToken) return cookieToken;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Unauthenticated" });
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Soft auth — attaches req.user if present but does not 401 on failure. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    /* ignore */
  }
  next();
}
