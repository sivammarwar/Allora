import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/** Validate and replace `req.body` with the parsed result. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten(),
      });
    }
    req.body = result.data;
    next();
  };
}

/** Validate and replace `req.query` with the parsed result. */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten(),
      });
    }
    (req as any).query = result.data;
    next();
  };
}
