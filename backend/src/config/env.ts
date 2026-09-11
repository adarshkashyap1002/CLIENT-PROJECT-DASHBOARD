import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  },
};
