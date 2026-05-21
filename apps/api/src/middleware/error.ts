import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger";
import { isProd } from "../env";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

// 4-arg signature is required for Express to recognize as error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err?.status ?? err?.statusCode ?? 500;

  const isPrismaError =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError;

  if (isPrismaError || status >= 500) logger.error(err);

  const message =
    isPrismaError || (isProd && status >= 500)
      ? "Service temporarily unavailable. Please try again."
      : (err?.message ?? "Internal server error");

  res.status(isPrismaError ? 503 : status).json({ error: message });
}
