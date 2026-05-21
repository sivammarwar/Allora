import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  tokenTTL,
} from "../lib/jwt";
import { assertOtpRateLimit, issueOtp, verifyOtp } from "../lib/otp";
import { sendMail, otpEmailHtml } from "../lib/mailer";
import { authLimiter } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { isProd } from "../env";
import { logger } from "../lib/logger";

const router = Router();

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  path: "/",
  ...(isProd && { domain: ".bharat333.com" }),
};

function setAuthCookies(
  res: import("express").Response,
  access: string,
  refresh: string
) {
  res.cookie("access_token", access, {
    ...cookieOpts,
    maxAge: tokenTTL.access * 1000,
  });
  res.cookie("refresh_token", refresh, {
    ...cookieOpts,
    maxAge: tokenTTL.refresh * 1000,
  });
}

function clearAuthCookies(res: import("express").Response) {
  res.clearCookie("access_token", cookieOpts);
  res.clearCookie("refresh_token", cookieOpts);
}

// ──────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// ──────────────────────────────────────────────────────────
const sendOtpSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  role: z
    .enum(["USER", "HERO", "DELIVERY_BOY", "AGENT", "ADMIN", "PRODUCT_MANAGER", "PAYMENT_MANAGER", "SECRET_SHOP", "ITEM_CATALOG"])
    .optional(),
  forceOtp: z.boolean().optional(), // true when resetting password
});

router.post(
  "/send-otp",
  authLimiter,
  validateBody(sendOtpSchema),
  async (req, res, next) => {
    try {
      const { email, role } = req.body as z.infer<typeof sendOtpSchema>;

      // Find existing user
      let user = await prisma.user.findUnique({ where: { email } });

      // First-time login auto-creation:
      //  - USER: always allowed
      //  - HERO / DELIVERY_BOY: allowed (self-registration); profile is built
      //    later via /hero/register-request etc.
      //  - ADMIN / AGENT / PRODUCT_MANAGER / PAYMENT_MANAGER: must be seeded
      //    or admin-added; reject self-registration.
      const SELF_REGISTERABLE: Array<typeof role> = ["USER", "HERO", "DELIVERY_BOY", "SECRET_SHOP"];
      if (!user) {
        const requestedRole = role ?? "USER";
        if (!SELF_REGISTERABLE.includes(requestedRole)) {
          return res
            .status(404)
            .json({ error: "No account found for that role. Please contact an administrator." });
        }
        user = await prisma.user.create({
          data: { email, role: requestedRole, isActive: true },
        });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is disabled." });
      }

      // Reject if role was specified and user has a different non-USER role
      if (role && user.role !== role && user.role !== "USER") {
        return res.status(403).json({
          error: `This email is registered as ${user.role.replace(/_/g, " ")}. Use the correct login page.`,
        });
      }

      // If user already has a password and this isn't a forced reset, skip OTP
      // and let the client show the password login step instead.
      if (user.passwordHash && !req.body.forceOtp) {
        return res.json({ ok: true, hasPassword: true });
      }

      // Rate limit only when actually sending an OTP
      await assertOtpRateLimit(email);

      const otp = await issueOtp(email);
      
      // Always log OTP for debugging
      logger.warn(`[auth] OTP generated for ${email}: ${otp}`);
      
      const result = await sendMail({
        to: email,
        subject: "Your Bharat Services verification code",
        html: otpEmailHtml(otp),
        text: `Your Bharat Services verification code is: ${otp} (valid for 10 minutes).`,
      });

      // Dev convenience: log OTP if SMTP isn't configured
      if ((result as any)?.skipped) {
        logger.warn(`[auth] SMTP skipped - OTP for ${email}: ${otp}`);
      }

      res.json({ ok: true, hasPassword: false, message: "OTP sent" });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ──────────────────────────────────────────────────────────
const verifyOtpSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

router.post(
  "/verify-otp",
  authLimiter,
  validateBody(verifyOtpSchema),
  async (req, res, next) => {
    try {
      const { email, otp } = req.body as z.infer<typeof verifyOtpSchema>;
      const ok = await verifyOtp(email, otp);
      if (!ok) return res.status(400).json({ error: "Invalid or expired OTP" });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Account unavailable" });
      }

      if (!user.isVerified) {
        await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
      }

      const access = signAccessToken({ id: user.id, role: user.role, email: user.email });
      const refresh = await signRefreshToken(user.id);
      setAuthCookies(res, access, refresh);

      res.json({
        ok: true,
        accessToken: access,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: true,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────
// POST /api/auth/refresh — rotates refresh token
// ──────────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    // Accept from cookie (web) OR request body (mobile)
    const token = (req as any).cookies?.refresh_token ?? req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const decoded = await verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.isActive) return res.status(403).json({ error: "Account unavailable" });

    // Rotate: revoke old, mint new
    await revokeRefreshToken(decoded.sub, decoded.jti!);
    const access = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refresh = await signRefreshToken(user.id);
    setAuthCookies(res, access, refresh);

    res.json({ ok: true, accessToken: access });
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────────────────
router.post("/logout", async (req, res) => {
  try {
    const token = (req as any).cookies?.refresh_token;
    if (token) {
      try {
        const decoded = await verifyRefreshToken(token);
        await revokeRefreshToken(decoded.sub, decoded.jti!);
      } catch {
        /* token already invalid */
      }
    }
  } finally {
    clearAuthCookies(res);
  }
  res.json({ ok: true });
});

// ──────────────────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        isActive: true,
        profileImageUrl: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────
// GET /api/auth/check-password?email=...
// Returns whether user has set a password yet (public)
// ──────────────────────────────────────────────────────────
router.get("/check-password", async (req, res, next) => {
  try {
    const email = String(req.query.email ?? "").toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "email required" });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, isActive: true },
    });
    // Don't reveal if email exists; just return hasPassword flag
    res.json({ hasPassword: !!(user?.passwordHash) });
  } catch (e) { next(e); }
});

// ──────────────────────────────────────────────────────────
// POST /api/auth/login-password
// Login with email + password (after password has been set)
// ──────────────────────────────────────────────────────────
const loginPasswordSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

router.post("/login-password", authLimiter, validateBody(loginPasswordSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginPasswordSchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.passwordHash) {
      return res.status(400).json({ error: "no_password", message: "No password set. Please sign in with OTP first." });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const access = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refresh = await signRefreshToken(user.id);
    setAuthCookies(res, access, refresh);
    res.json({
      ok: true,
      accessToken: access,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (e) { next(e); }
});

// ──────────────────────────────────────────────────────────
// POST /api/auth/set-password  (requires auth)
// Called after OTP verify to set or reset password
// ──────────────────────────────────────────────────────────
const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/set-password", requireAuth, validateBody(setPasswordSchema), async (req, res, next) => {
  try {
    const { password } = req.body as z.infer<typeof setPasswordSchema>;
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: hash, isVerified: true },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;

// helper export so callers can construct typed cookies if needed
export const _authCookieOpts = cookieOpts;
export type AnyRole = Role;
