import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";

export interface AuthedRequest extends Request {
  user?: AccessTokenPayload;
}

// Verifies the access token on every protected route. A modified or forged
// token fails signature verification here and never reaches the controller,
// which is what makes this different from frontend-only role hiding.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "Missing access token" } });
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } });
  }
}

// Route-level role gate. Applied per-route, not left to controllers to remember.
export function requireRole(...roles: Array<"ADMIN" | "PM" | "DEVELOPER">) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient role" } });
    }
    next();
  };
}
