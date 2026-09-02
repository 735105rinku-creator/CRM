import { ROLE_PERMISSIONS, ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

export const userRoleLevel = (user) => {
  if (Number.isFinite(user?.roleRef?.level)) return user.roleRef.level;
  if (user?.role === ROLES.SUPER_ADMIN || user?.isPlatformUser) return 0;
  if (user?.role === ROLES.COMPANY_ADMIN) return 1;
  if (user?.role === ROLES.HR) return 2;
  if (user?.role === ROLES.EMPLOYEE) return 4;
  return 4;
};

export const userPermissions = (user) =>
  Array.from(new Set([...(user?.permissions || []), ...(user?.roleRef?.permissions || []), ...(ROLE_PERMISSIONS[user?.role] || [])]));

export const checkPermission = (permission) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));
  if (userRoleLevel(req.user) === 0) return next();
  if (!userPermissions(req.user).includes(permission)) {
    return next(new ApiError(403, "Permission denied"));
  }
  return next();
};

export const checkHierarchyLevel = (maxLevel) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));
  const level = userRoleLevel(req.user);
  if (level > maxLevel) {
    return next(new ApiError(403, "Hierarchy level denied"));
  }
  return next();
};

export const canManageTargetLevel = (actor, targetLevel) => userRoleLevel(actor) < Number(targetLevel);
