import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

export const requireTenant = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));

  if (req.user.role === ROLES.SUPER_ADMIN || req.user.isPlatformUser) {
    return next();
  }

  if (!req.auth?.companyId) {
    return next(new ApiError(403, "Company context missing"));
  }

  next();
};

export const requirePlatformUser = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.SUPER_ADMIN) {
    return next(new ApiError(403, "Only super admin allowed"));
  }

  next();
};