import { PrismaClient } from "@prisma/client";
import { isProd } from "../env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (!isProd) globalForPrisma.prisma = prisma;

export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use a lightweight query instead of $connect() — Transaction Pooler
      // doesn't support persistent connections, but Prisma lazy-connects fine.
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}
