import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be ≥32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be ≥32 chars"),

  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),

  // Optional integrations — features degrade gracefully if missing
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Bharat Services <no-reply@bharat333.com>"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  PHONEPE_MERCHANT_ID: z.string().optional(),
  PHONEPE_CLIENT_ID: z.string().optional(),
  PHONEPE_CLIENT_SECRET: z.string().optional(),
  PHONEPE_CLIENT_VERSION: z.string().default("1"),
  PHONEPE_UAT: z.string().default("true"),
  API_PUBLIC_URL: z.string().optional(),

  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),

  // Firebase Cloud Messaging (FCM) for push notifications
  FCM_PROJECT_ID: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),

  ADMIN_EMAIL: z.string().email().default("admin@bharat333.com"),
  PRODUCT_MANAGER_EMAIL: z.string().email().default("pm@bharat333.com"),
  PAYMENT_MANAGER_EMAIL: z.string().email().default("payments@bharat333.com"),
  ITEM_CATALOG_EMAIL: z.string().email().default("catalog@bharat333.com"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("✅ Environment variables loaded successfully");
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
