import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const secure =
  env.SMTP_SECURE === undefined
    ? Number(env.SMTP_PORT || 587) === 465
    : env.SMTP_SECURE;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: env.NODE_ENV === "production",
  },
});

try {
  await transporter.verify();
  console.log("[smtp] Verification successful", {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    user: env.SMTP_USER,
    from: env.SMTP_FROM,
  });
} catch (error) {
  console.error("[smtp] Verification failed", {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    user: env.SMTP_USER,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    message: error.message,
  });
  process.exit(1);
}
