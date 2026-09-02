import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  resetUserPassword,
  changeUserRole,
  assignPermissions,
} from "../controllers/user.controller.js";

import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);

router.post("/", requirePermission(PERMISSIONS.USER_CREATE),createUser);

router.get(
  "/",
  requirePermission(PERMISSIONS.USER_READ),
  getUsers
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.USER_READ),
  getUserById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.USER_UPDATE),
  updateUser
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.USER_DELETE),
  deleteUser
);

router.patch(
  "/:id/block",
  requirePermission(PERMISSIONS.USER_BLOCK),
  blockUser
);

router.patch(
  "/:id/unblock",
  requirePermission(PERMISSIONS.USER_UNBLOCK),
  unblockUser
);

router.patch(
  "/:id/reset-password",
  requirePermission(PERMISSIONS.USER_RESET_PASSWORD),
  resetUserPassword
);

router.patch(
  "/:id/change-role",
  requirePermission(PERMISSIONS.USER_ASSIGN_ROLE),
  changeUserRole
);

router.patch(
  "/:id/permissions",
  requirePermission(PERMISSIONS.USER_ASSIGN_PERMISSION),
  assignPermissions
);

export default router;