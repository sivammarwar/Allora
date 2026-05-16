/**
 * Seed default privileged accounts so the platform is operable
 * immediately after migration.
 *
 * Run with:  npm run seed   (from the repo root)
 *
 * Reads ADMIN_EMAIL, PRODUCT_MANAGER_EMAIL, PAYMENT_MANAGER_EMAIL
 * from `.env` (loaded via apps/api/src/env.ts).
 */
import { PrismaClient, Role } from "@prisma/client";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

const seedUsers: Array<{ email: string; role: Role; name: string }> = [
  {
    email: (process.env.ADMIN_EMAIL ?? "admin@bharat333.com").toLowerCase(),
    role: "ADMIN",
    name: "Admin",
  },
  {
    email: (process.env.PRODUCT_MANAGER_EMAIL ?? "pm@bharat333.com").toLowerCase(),
    role: "PRODUCT_MANAGER",
    name: "Product Manager",
  },
  {
    email: (process.env.PAYMENT_MANAGER_EMAIL ?? "payments@bharat333.com").toLowerCase(),
    role: "PAYMENT_MANAGER",
    name: "Payment Manager",
  },
  {
    email: (process.env.ITEM_CATALOG_EMAIL ?? "catalog@bharat333.com").toLowerCase(),
    role: "ITEM_CATALOG",
    name: "Item Catalog Manager",
  },
];

async function main() {
  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, isActive: true },
      create: { email: u.email, role: u.role, name: u.name, isActive: true },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ ensured ${u.role.padEnd(16)} ${u.email}`);
  }

  await prisma.globalSetting.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", userVisibilityRadiusKm: 5 },
  });
  // eslint-disable-next-line no-console
  console.log("✓ ensured GlobalSetting (radius=5km)");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
