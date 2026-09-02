import { Router } from "express";
import {
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  unlockAccount,
  adminUnlockUser,
  getMySessions,
  revokeMySession,
  registerCompany,
} from "../controllers/auth.controller.js";
import {
  requireAuth,
  requireAuthOrForceChange,
  requireRole,
} from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rateLimit.middleware.js";
import { ROLES } from "../constants/roles.js";
import { uploadCompanyLogo, uploadProfileImage } from "../middleware/upload.middleware.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();


const parseProfileImage = (req, res, next) => {
  uploadProfileImage.single("profileImage")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "Profile image must be 2 MB or smaller."));
    }

    return next(error);
  });
};

const parseCompanyLogo = (req, res, next) => {
  uploadCompanyLogo.single("logo")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "Company logo must be 2 MB or smaller."));
    }

    return next(error);
  });
};

router.post("/register-company", parseCompanyLogo, registerCompany);
router.get("/login", (req, res) => {
  res.redirect(`${process.env.CLIENT_ORIGIN || "https://opasbizz.co.in"}/login`);
});
router.post("/login", loginRateLimiter, login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/unlock-account", unlockAccount);


router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);
router.patch("/profile", requireAuth, parseProfileImage, updateProfile);
router.get("/sessions", requireAuth, getMySessions);
router.delete("/sessions/:sessionId", requireAuth, revokeMySession);

router.post("/change-password", requireAuthOrForceChange, changePassword);

router.post(
  "/admin/unlock-user/:userId",
  requireAuth,
  requireRole(ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN),
  adminUnlockUser
);

export default router;


