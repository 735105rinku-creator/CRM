import dotenv from "dotenv";

dotenv.config({ override: true });

const toNumber = (key, fallback, { min, max } = {}) => {
  const raw = process.env[key];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);

  if (
    !Number.isFinite(value) ||
    (min !== undefined && value < min) ||
    (max !== undefined && value > max)
  ) {
    throw new Error(`Invalid environment variable : ${key}`);
  }

  return value;
};

const required = [
  "NODE_ENV",
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable : ${key}`);
  }
}

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: toNumber("PORT", undefined, { min: 1, max: 65535 }),
  MONGO_URI: process.env.MONGO_URI.trim(),
  DB_CONNECT_TIMEOUT_MS: toNumber("DB_CONNECT_TIMEOUT_MS", 5000, {
    min: 1000,
  }),

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "https://opasbizz.co.in",
  CLIENT_ORIGINS: process.env.CLIENT_ORIGINS || "",
  APP_NAME: process.env.APP_NAME || "OPAS CRM",
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || "",

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  BCRYPT_ROUNDS: toNumber("BCRYPT_ROUNDS", 12, { min: 4 }),

  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: toNumber("SMTP_PORT", 587, { min: 1, max: 65535 }),
  SMTP_SECURE:
    process.env.SMTP_SECURE === undefined
      ? undefined
      : process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "no-reply@opascrm.com",

  SUPER_ADMIN_SMTP_HOST: process.env.SUPER_ADMIN_SMTP_HOST || process.env.SMTP_HOST || "",
  SUPER_ADMIN_SMTP_PORT: toNumber("SUPER_ADMIN_SMTP_PORT", process.env.SMTP_PORT || 587, { min: 1, max: 65535 }),
  SUPER_ADMIN_SMTP_SECURE:
    process.env.SUPER_ADMIN_SMTP_SECURE === undefined
      ? undefined
      : process.env.SUPER_ADMIN_SMTP_SECURE === "true",
  SUPER_ADMIN_SMTP_USER: process.env.SUPER_ADMIN_SMTP_USER || process.env.SMTP_USER || "",
  SUPER_ADMIN_SMTP_PASS: process.env.SUPER_ADMIN_SMTP_PASS || process.env.SMTP_PASS || "",
  SUPER_ADMIN_SMTP_FROM:
    process.env.SUPER_ADMIN_SMTP_FROM ||
    `Opas Bizz pvt ltd <${process.env.SUPER_ADMIN_SMTP_USER || process.env.SMTP_USER || "no-reply@opascrm.com"}>`,
  SUPER_ADMIN_MAIL_LOGO_URL:
    process.env.SUPER_ADMIN_MAIL_LOGO_URL || `${process.env.CLIENT_ORIGIN || "https://opasbizz.co.in"}/brand/opasbizz-crm.webp`,

  LOGIN_RATE_LIMIT_WINDOW_MS:
    toNumber("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000, { min: 1000 }),
  LOGIN_RATE_LIMIT_MAX: toNumber("LOGIN_RATE_LIMIT_MAX", 10, { min: 1 }),
});


