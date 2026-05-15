import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import type { Role } from "@prisma/client";
import { env } from "../env";
import { redis } from "./redis";

const ACCESS_TTL_SEC = 15 * 60;          // 15 min
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export interface AccessPayload extends JwtPayload {
  sub: string;        // userId
  role: Role;
  email: string;
}

export interface RefreshPayload extends JwtPayload {
  sub: string;
  jti: string;
}

const refreshKey = (userId: string, jti: string) => `rt:${userId}:${jti}`;

export function signAccessToken(user: { id: string; role: Role; email: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email } satisfies AccessPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL_SEC }
  );
}

export async function signRefreshToken(userId: string) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, jti } satisfies RefreshPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TTL_SEC }
  );
  try {
    await redis.set(refreshKey(userId, jti), "1", "EX", REFRESH_TTL_SEC);
  } catch {
    console.warn("[jwt] Redis unavailable, refresh token not stored in cache");
  }
  return token;
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  try {
    const exists = await redis.get(refreshKey(decoded.sub, decoded.jti));
    if (exists === null) throw new Error("Refresh token revoked");
  } catch (e: any) {
    if (e.message === "Refresh token revoked") throw e;
    console.warn("[jwt] Redis unavailable, skipping revocation check");
  }
  return decoded;
}

export async function revokeRefreshToken(userId: string, jti: string) {
  try { await redis.del(refreshKey(userId, jti)); } catch {}
}

export async function revokeAllRefreshTokens(userId: string) {
  try {
    const stream = redis.scanStream({ match: `rt:${userId}:*` });
    for await (const keys of stream) {
      if ((keys as string[]).length) await redis.del(...(keys as string[]));
    }
  } catch {}
}

export const tokenTTL = { access: ACCESS_TTL_SEC, refresh: REFRESH_TTL_SEC };
