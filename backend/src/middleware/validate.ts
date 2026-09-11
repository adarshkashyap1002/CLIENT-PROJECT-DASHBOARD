import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

// Server-side validation is the source of truth; frontend validation is only
// for UX. This runs regardless of what the client sent, including direct
// API calls that bypass the UI entirely.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: result.error.issues.map(i => i.message).join(", ") },
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: result.error.issues.map(i => i.message).join(", ") },
      });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
