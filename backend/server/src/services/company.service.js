import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/User.js";

import {
  COMPANY_STATUS,
  ROLE_PERMISSIONS,
  ROLES,
  USER_STATUS,
} from "../constants/roles.js";

import {
  createCompanyRecord,
  deleteCompanyById,
  findCompanyByCode,
  findCompanyByEmail,
  findCompanyById,
  listCompanies,
  updateCompanyById,
} from "../repositories/company.repository.js";

import {
  createUserRecord,
  findUserByEmail,
} from "../repositories/user.repository.js";

const ensureSuperAdmin = (currentUser) => {
  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "Only super admin can perform this action.");
  }
};

export const createCompanyService = async (currentUser, payload) => {
  ensureSuperAdmin(currentUser);

  const codeExists = await findCompanyByCode(payload.companyCode);

  if (codeExists) {
    throw new ApiError(409, "Company code already exists.");
  }

  const emailExists = await findCompanyByEmail(payload.email);

  if (emailExists) {
    throw new ApiError(409, "Company email already exists.");
  }

  const company = await createCompanyRecord({
    ...payload,
    status: COMPANY_STATUS.TRIAL,
    createdBy: currentUser._id,
  });

  return company;
};

export const getCompaniesService = async (currentUser, query = {}) => {
  ensureSuperAdmin(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {};

  if (query.status) filter.status = query.status;

  if (query.subscriptionStatus) {
    filter.subscriptionStatus = query.subscriptionStatus;
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return listCompanies({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getCompanyByIdService = async (currentUser, companyId) => {
  ensureSuperAdmin(currentUser);

  const company = await findCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateCompanyService = async (currentUser, companyId, payload) => {
  ensureSuperAdmin(currentUser);

  const company = await updateCompanyById(companyId, {
    ...payload,
    updatedBy: currentUser._id,
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateCompanyStatusService = async (
  currentUser,
  companyId,
  payload
) => {
  ensureSuperAdmin(currentUser);

  const company = await updateCompanyById(companyId, {
    status: payload.status,
    subscriptionStatus: payload.subscriptionStatus,
    subscriptionEndsAt: payload.subscriptionEndsAt,
    trialEndsAt: payload.trialEndsAt,
    updatedBy: currentUser._id,
  });

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const deleteCompanyService = async (currentUser, companyId) => {
  ensureSuperAdmin(currentUser);

  const company = await deleteCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return true;
};

export const createCompanyAdminService = async (
  currentUser,
  companyId,
  payload
) => {
  ensureSuperAdmin(currentUser);

  const company = await findCompanyById(companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  if ([COMPANY_STATUS.SUSPENDED, COMPANY_STATUS.BLOCKED].includes(company.status)) {
    throw new ApiError(400, "Cannot create admin for suspended or blocked company.");
  }

  const adminEmail = String(payload.email || "").trim().toLowerCase();

  if (!adminEmail) {
    throw new ApiError(400, "Company admin email is required.");
  }

  const exists = await findUserByEmail(adminEmail);

  if (exists) {
    throw new ApiError(409, "Email already exists.");
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_ROUNDS);

  const user = await createUserRecord({
    companyId: company._id,
    isPlatformUser: false,

    name: payload.name,
    email: adminEmail,
    mobile: payload.mobile || "",
    passwordHash,

    role: ROLES.COMPANY_ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN] || [],

    department: payload.department || "",
    designation: payload.designation || "Company Admin",

    status: USER_STATUS.ACTIVE,

    isEmailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,

    forcePasswordChange: false,

    createdBy: currentUser._id,
  });

  return {
    ...user.toSafeObject(),
    emailVerificationRequired: false,
  };
};

export const getMyCompanyProfileService = async (currentUser) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(400, "Super admin does not belong to a company.");
  }

  const company = await findCompanyById(currentUser.companyId);

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company;
};

export const updateMyCompanyProfileService = async (currentUser, payload) => {
  if (currentUser.role !== ROLES.COMPANY_ADMIN) {
    throw new ApiError(403, "Only company admin can update company profile.");
  }

  const existingCompany = await findCompanyById(currentUser.companyId);

  if (!existingCompany) {
    throw new ApiError(404, "Company not found.");
  }

  const existingSettings =
    typeof existingCompany.settings?.toObject === "function"
      ? existingCompany.settings.toObject()
      : existingCompany.settings || {};

  const company = await updateCompanyById(currentUser.companyId, {
    ...payload,
    ...(payload.settings
      ? {
          settings: {
            ...existingSettings,
            ...payload.settings,
            theme: {
              ...(existingSettings.theme || {}),
              ...(payload.settings.theme || {}),
            },
          },
        }
      : {}),
    updatedBy: currentUser._id,
  });

  if (payload.logo) {
    await User.updateMany(
      { companyId: currentUser.companyId, role: ROLES.COMPANY_ADMIN },
      { $set: { profileImage: payload.logo, updatedBy: currentUser._id } },
      { runValidators: true }
    );
  }

  return company;
};

