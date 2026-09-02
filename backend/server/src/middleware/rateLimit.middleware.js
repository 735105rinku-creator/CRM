import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

// Rate limiter keyed on IP + email combined.
// - ipKeyGenerator(req.ip) handles IPv6 subnet normalisation correctly
//   (express-rate-limit v8 requires this helper when using req.ip in a
//   custom keyGenerator, otherwise it throws ERR_ERL_KEY_GEN_IPV6).
// - Including email means users on a shared IP (office / NAT) don't
//   block each other — each account has its own independent counter.
export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    const email = (req.body?.email || "").toLowerCase().trim();
    const ip = ipKeyGenerator(req.ip || "");
    return `${ip}::${email}`;
  },

  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});