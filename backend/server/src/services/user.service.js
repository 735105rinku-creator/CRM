import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { ROLE_PERMISSIONS, ROLES, USER_STATUS } from "../constants/roles.js";
import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  listUsers,
  updateUserById,
  countActiveCompanyAdmins,
} from "../repositories/user.repository.js";
import { findCompanyById } from "../repositories/company.repository.js";
import { findCompanyByCode } from "../repositories/company.repository.js";
import {
  sendAdminPasswordResetEmail,
} from "./email.service.js";
import { ensureEmployeeUserLimit, ensureHrLimit } from "./subscriptionLimit.service.js";


const getIdString = (value) => {
  if (!value) return "";
  return String(value._id || value);
};

const sameCompany = (currentUser, targetUser) => {
  return (
    currentUser.companyId &&
    targetUser.companyId &&
    getIdString(currentUser.companyId) === getIdString(targetUser.companyId)
  );
};

const canCreateRole = (currentUser, targetRole) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return [
      ROLES.COMPANY_ADMIN,
      ROLES.HR,
      ROLES.SUPPORT,
      ROLES.EMPLOYEE,
    ].includes(targetRole);
  }

  if (currentUser.role === ROLES.COMPANY_ADMIN) {
    return targetRole === ROLES.HR;
  }

  if (currentUser.role === ROLES.HR) {
    return [ROLES.SUPPORT, ROLES.EMPLOYEE].includes(targetRole);
  }

  return false;
};

const resolveCompanyForNewUser = async (currentUser, payload) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    if (!payload.companyId && !payload.companyCode) {
      throw new ApiError(400, "companyId or companyCode is required.");
    }

    let company = null;

    if (payload.companyId) {
      company = await findCompanyById(payload.companyId);
    }

    if (!company && payload.companyCode) {
      company = await findCompanyByCode(payload.companyCode);
    }

    if (!company) {
      throw new ApiError(404, "Company not found.");
    }

    return company._id;
  }

  if (!currentUser.companyId) {
    throw new ApiError(400, "Current user company is missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canManageUser = (currentUser, targetUser) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  if (!sameCompany(currentUser, targetUser)) {
    return false;
  }

  if (currentUser.role === ROLES.COMPANY_ADMIN) {
    return [ROLES.HR, ROLES.SUPPORT, ROLES.EMPLOYEE].includes(targetUser.role);
  }

  if (currentUser.role === ROLES.HR) {
    return [ROLES.SUPPORT, ROLES.EMPLOYEE].includes(targetUser.role);
  }

  return false;
};

const ensureActivationLimit = async (companyId, role) => {
  if (role === ROLES.HR) {
    await ensureHrLimit(companyId);
  }

  if (role === ROLES.EMPLOYEE) {
    await ensureEmployeeUserLimit(companyId);
  }
};
const buildVisibilityFilter = (currentUser, query) => {
  const filter = {};

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    if (query.companyId) filter.companyId = query.companyId;
    if (query.role) filter.role = query.role;
  } else if (currentUser.role === ROLES.COMPANY_ADMIN) {
    filter.companyId = currentUser.companyId._id || currentUser.companyId;
    filter.role = { $in: [ROLES.HR, ROLES.SUPPORT, ROLES.EMPLOYEE] };

    if (query.role) {
      if (![ROLES.HR, ROLES.SUPPORT, ROLES.EMPLOYEE].includes(query.role)) {
        throw new ApiError(
          403,
          "Company admin can only view HR, support and employee users."
        );
      }

      filter.role = query.role;
    }
  } else if (currentUser.role === ROLES.HR) {
    filter.companyId = currentUser.companyId._id || currentUser.companyId;
    filter.role = { $in: [ROLES.SUPPORT, ROLES.EMPLOYEE] };

    if (query.role) {
      if (![ROLES.SUPPORT, ROLES.EMPLOYEE].includes(query.role)) {
        throw new ApiError(403, "HR can only view support and employee users.");
      }

      filter.role = query.role;
    }
  } else {
    throw new ApiError(403, "You are not allowed to view users.");
  }

  if (query.status) filter.status = query.status;

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
      { employeeCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

export const createUserService = async (currentUser, payload) => {
  if (!canCreateRole(currentUser, payload.role)) {
    const message = currentUser.role === ROLES.COMPANY_ADMIN
      ? "Company Admin can create HR users only. HR creates employees for this company."
      : "You are not allowed to create this role.";
    throw new ApiError(403, message);
  }

  const exists = await findUserByEmail(payload.email);

  if (exists) {
    throw new ApiError(409, "Email already exists.");
  }

  const companyId = await resolveCompanyForNewUser(currentUser, payload);

  if (payload.role === ROLES.HR) {
    await ensureHrLimit(companyId);
  }

  if (payload.role === ROLES.EMPLOYEE) {
    await ensureEmployeeUserLimit(companyId);
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_ROUNDS);

  const user = await createUserRecord({
    companyId,
    isPlatformUser: false,
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile || "",
    passwordHash,
    role: payload.role,
    permissions: ROLE_PERMISSIONS[payload.role] || [],
    employeeCode: payload.employeeCode || undefined,
    department: payload.department || "",
    designation: payload.designation || "",
    status: USER_STATUS.ACTIVE,

    isEmailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,

    // keep false if you want login directly after verification
    forcePasswordChange: false,

    createdBy: currentUser._id,
  });

  return {
    ...user.toSafeObject(),
    emailVerificationRequired: false,
  };
};

export const getUsersService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);
  const filter = buildVisibilityFilter(currentUser, query);

  return listUsers({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getUserByIdService = async (currentUser, id) => {
  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, user)) {
    throw new ApiError(403, "You are not allowed to view this user.");
  }

  return user.toSafeObject();
};

export const updateUserService = async (currentUser, id, payload) => {
  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to update this user.");
  }

  if (payload.status === USER_STATUS.ACTIVE && targetUser.status !== USER_STATUS.ACTIVE) {
    await ensureActivationLimit(targetUser.companyId, targetUser.role);
  }

  const user = await updateUserById(id, {
    ...payload,
    updatedBy: currentUser._id,
  });

  return user.toSafeObject();
};

export const deleteUserService = async (currentUser, id) => {
  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot delete your own account.");
  }

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can delete users.");
  }

  if (targetUser.role === ROLES.COMPANY_ADMIN) {
    const adminCount = await countActiveCompanyAdmins(targetUser.companyId);

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot delete the last active company admin.");
    }
  }

  await deleteUserById(id);

  return true;
};

export const blockUserService = async (currentUser, id) => {
  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot block your own account.");
  }

  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to block this user.");
  }

  if (targetUser.role === ROLES.COMPANY_ADMIN) {
    const adminCount = await countActiveCompanyAdmins(targetUser.companyId);

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot block the last active company admin.");
    }
  }

  targetUser.status = USER_STATUS.BLOCKED;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  return targetUser.toSafeObject();
};

export const unblockUserService = async (currentUser, id) => {
  const targetUser = await findUserById(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(403, "You are not allowed to unblock this user.");
  }

  if (targetUser.status !== USER_STATUS.ACTIVE) {
    await ensureActivationLimit(targetUser.companyId, targetUser.role);
  }

  targetUser.status = USER_STATUS.ACTIVE;
  targetUser.loginAttempts = 0;
  targetUser.lockUntil = null;
  targetUser.unlockTokenHash = null;
  targetUser.unlockTokenExpiresAt = null;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  return targetUser.toSafeObject();
};


export const resetUserPasswordService = async (
  currentUser,
  id,
  password,
  { sendEmail = true } = {}
) => {
  const targetUser = await findUserByIdWithPassword(id);

  if (!targetUser) {
    throw new ApiError(404, "User not found.");
  }

  if (!canManageUser(currentUser, targetUser)) {
    throw new ApiError(
      403,
      "You are not allowed to reset this user's password."
    );
  }

  if (currentUser._id.toString() === targetUser._id.toString()) {
    throw new ApiError(400, "You cannot reset your own password from this panel.");
  }

  targetUser.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  targetUser.forcePasswordChange = true;
  targetUser.loginAttempts = 0;
  targetUser.lockUntil = null;
  targetUser.resetPasswordTokenHash = null;
  targetUser.resetPasswordExpiresAt = null;
  targetUser.unlockTokenHash = null;
  targetUser.unlockTokenExpiresAt = null;
  targetUser.updatedBy = currentUser._id;

  await targetUser.save();

  const result = {
    passwordReset: true,
    forcePasswordChange: true,
    emailSent: false,
    emailSentTo: null,
    emailWarning: null,
  };

  if (!sendEmail) {
    result.emailWarning = "Email sending was disabled for this reset.";
    return result;
  }

  try {
    await sendAdminPasswordResetEmail({
      to: targetUser.email,
      name: targetUser.name,
      temporaryPassword: password,
      loginUrl: `${env.CLIENT_ORIGIN}/login`,
      resetByName: currentUser.name,
    });

    result.emailSent = true;
    result.emailSentTo = targetUser.email;
  } catch (error) {
    result.emailWarning = `Password was reset, but email could not be sent. Share the temporary password manually. ${error.message}`;
  }

  return result;
};

export const changeRoleService = async (currentUser, id, role) => {
  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can change roles.");
  }

  if (currentUser._id.toString() === id) {
    throw new ApiError(400, "You cannot change your own role.");
  }

  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (user.role === ROLES.COMPANY_ADMIN && role !== ROLES.COMPANY_ADMIN) {
    const adminCount = await countActiveCompanyAdmins(user.companyId);

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot change the last active company admin.");
    }
  }

  user.role = role;
  user.permissions = ROLE_PERMISSIONS[role] || [];
  user.updatedBy = currentUser._id;

  await user.save();

  return user.toSafeObject();
};

export const assignPermissionsService = async (
  currentUser,
  id,
  permissions = []
) => {
  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can assign permissions.");
  }

  const user = await findUserById(id);

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.permissions = permissions;
  user.updatedBy = currentUser._id;

  await user.save();

  return user.toSafeObject();
};







