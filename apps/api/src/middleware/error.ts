import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

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
  const message = err?.message ?? "Internal server error";
  if (status >= 500) logger.error(err);
  res.status(status).json({ error: message });
}
