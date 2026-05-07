// Mirrors Prisma `Role` enum — keep in sync with apps/api/prisma/schema.prisma
export type Role =
  | "ADMIN"
  | "AGENT"
  | "HERO"
  | "DELIVERY_BOY"
  | "USER"
  | "PRODUCT_MANAGER"
  | "PAYMENT_MANAGER"
  | "SECRET_SHOP"
  | "ITEM_CATALOG";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  role: Role;
  isVerified: boolean;
  isActive?: boolean;
  profileImageUrl?: string | null;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  polygon: GeoJSON.Polygon | GeoJSON.FeatureCollection;
  createdAt: string;
  updatedAt: string;
  agentCount?: number;
}

/** Default home path per role. */
export const roleHome: Record<Role, string> = {
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

/** Login URL per role. */
export const roleLogin: Record<Role, string> = {
  ADMIN: "/admin/login",
  AGENT: "/agent/login",
  HERO: "/hero/login",
  DELIVERY_BOY: "/delivery/login",
  USER: "/login",
  PRODUCT_MANAGER: "/pm/login",
  PAYMENT_MANAGER: "/pay/login",
  SECRET_SHOP: "/secret-shop/login",
  ITEM_CATALOG: "/item-catalog/login",
};
