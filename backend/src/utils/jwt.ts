import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  userId: string;
  role: "ADMIN" | "PM" | "DEVELOPER";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // jsonwebtoken's types want its own StringValue union for expiresIn, not
  // a plain string, even though "15m" etc. is exactly what it expects at
  // runtime — cast rather than fight the type.
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.jwt.refreshSecret, {
    expiresIn: `${env.jwt.refreshTtlDays}d` as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { userId: string };
}
