import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

const REFRESH_COOKIE = "refreshToken";

function refreshCookieOptions() {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, "NO_REFRESH_TOKEN", "No refresh token provided");

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  res.json({ accessToken });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json({ user });
}
