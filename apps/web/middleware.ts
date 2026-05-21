import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ─── Route → required role (prefix match) ────────────────────────
const ROLE_ROUTES: { prefix: string; role: string; loginPath: string }[] = [
  { prefix: "/admin",        role: "ADMIN",            loginPath: "/admin/login" },
  { prefix: "/agent",        role: "AGENT",            loginPath: "/agent/login" },
  { prefix: "/hero",         role: "HERO",             loginPath: "/hero/login" },
  { prefix: "/delivery",     role: "DELIVERY_BOY",     loginPath: "/delivery/login" },
  { prefix: "/pm",           role: "PRODUCT_MANAGER",  loginPath: "/pm/login" },
  { prefix: "/pay",          role: "PAYMENT_MANAGER",  loginPath: "/pay/login" },
  { prefix: "/secret-shop",  role: "SECRET_SHOP",      loginPath: "/secret-shop/login" },
  { prefix: "/item-catalog", role: "ITEM_CATALOG",     loginPath: "/item-catalog/login" },
  { prefix: "/dashboard",    role: "USER",             loginPath: "/login" },
  { prefix: "/orders",       role: "USER",             loginPath: "/login" },
  { prefix: "/cart",         role: "USER",             loginPath: "/login" },
  { prefix: "/main-inventory", role: "_CUSTOM",        loginPath: "/main-inventory/login" },
];

// Paths that are always public — skip auth check entirely
const PUBLIC_PREFIXES = [
  "/login",
  "/about",
  "/contact",
  "/how-it-works",
  "/legal",
  "/_next",
  "/favicon",
  "/api",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  // login sub-pages for all roles
  if (pathname.endsWith("/login")) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Find matching protected route
  const match = ROLE_ROUTES.find((r) => pathname.startsWith(r.prefix));
  if (!match) return NextResponse.next();

  // Read and verify access_token cookie
  const token = req.cookies.get("access_token")?.value;
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(new URL(`${match.loginPath}?redirect=${encodeURIComponent(pathname)}`, req.url));
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    const role = payload.role as string;

    // Custom main-inventory gate: ADMIN or specific email
    if (match.role === "_CUSTOM") {
      const ALLOWED_EMAIL = "govindkkp+maininventory@gmail.com";
      if (role !== "ADMIN" && payload.email !== ALLOWED_EMAIL) {
        return NextResponse.redirect(new URL(match.loginPath, req.url));
      }
      return NextResponse.next();
    }

    // Role mismatch → redirect to their own home
    if (role !== match.role) {
      const roleHomeMap: Record<string, string> = {
        ADMIN: "/admin/dashboard",
        AGENT: "/agent/dashboard",
        HERO: "/hero/dashboard",
        DELIVERY_BOY: "/delivery/dashboard",
        USER: "/dashboard",
        PRODUCT_MANAGER: "/pm/dashboard",
        PAYMENT_MANAGER: "/pay/dashboard",
        SECRET_SHOP: "/secret-shop/dashboard",
        ITEM_CATALOG: "/item-catalog/dashboard",
      };
      const home = roleHomeMap[role] ?? "/login";
      return NextResponse.redirect(new URL(home, req.url));
    }

    return NextResponse.next();
  } catch {
    // Token invalid or expired → redirect to login
    return NextResponse.redirect(
      new URL(`${match.loginPath}?redirect=${encodeURIComponent(pathname)}`, req.url)
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|mp4|mp3|wav)).*)",
  ],
};
