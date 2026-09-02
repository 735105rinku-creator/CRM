import { Company } from "../models/Company.js";
import { countEmployees } from "../repositories/employee.repository.js";
import { User } from "../models/User.js";
import { ROLES, SUBSCRIPTION_STATUS, USER_STATUS } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

const PLAN_LIMITS = Object.freeze({
  basic: { employeeLimit: 20, hrAccountLimit: 1 },
  standard: { employeeLimit: 100, hrAccountLimit: 2 },
  business: { employeeLimit: -1, hrAccountLimit: -1 },
});

const getLimit = (company, key) => {
  const stored = Number(company?.[key]);
  if (!Number.isNaN(stored) && stored !== 0) return stored;
  return PLAN_LIMITS[company?.subscriptionPlan || "basic"]?.[key] ?? PLAN_LIMITS.basic[key];
};

export const ensureSubscriptionAccess = async (companyId) => {
  const company = await Company.findById(companyId).select("subscriptionPlan subscriptionStatus subscriptionEndsAt maxEmployees hrAccountLimit");
  if (!company) throw new ApiError(404, "Company not found.");

  if ([SUBSCRIPTION_STATUS.EXPIRED, SUBSCRIPTION_STATUS.CANCELLED].includes(company.subscriptionStatus)) {
    throw new ApiError(402, "Company subscription is not active. Please renew a plan.");
  }

  if (company.subscriptionEndsAt && company.subscriptionEndsAt < new Date()) {
    company.subscriptionStatus = SUBSCRIPTION_STATUS.EXPIRED;
    await company.save();
    throw new ApiError(402, "Company subscription has expired. Please renew a plan.");
  }

  return company;
};

export const ensureEmployeeLimit = async (companyId) => {
  const company = await ensureSubscriptionAccess(companyId);
  const employeeLimit = getLimit(company, "maxEmployees");
  if (employeeLimit < 0) return;

  const employeeCount = await countEmployees({ companyId, isActive: true });
  if (employeeCount >= employeeLimit) {
    throw new ApiError(402, `Your ${company.subscriptionPlan} plan allows ${employeeLimit} employees. Upgrade your plan to add more employees.`);
  }
};

export const ensureEmployeeUserLimit = async (companyId) => {
  const company = await ensureSubscriptionAccess(companyId);
  const employeeLimit = getLimit(company, "maxEmployees");
  if (employeeLimit < 0) return;

  const employeeUserCount = await User.countDocuments({ companyId, role: ROLES.EMPLOYEE, status: USER_STATUS.ACTIVE });
  if (employeeUserCount >= employeeLimit) {
    throw new ApiError(402, `Your ${company.subscriptionPlan} plan allows ${employeeLimit} employee user(s). Upgrade your plan to add more employee users.`);
  }
};

export const ensureHrLimit = async (companyId) => {
  const company = await ensureSubscriptionAccess(companyId);
  const hrAccountLimit = getLimit(company, "hrAccountLimit");
  if (hrAccountLimit < 0) return;

  const hrCount = await User.countDocuments({ companyId, role: ROLES.HR, status: USER_STATUS.ACTIVE });
  if (hrCount >= hrAccountLimit) {
    throw new ApiError(402, `Your ${company.subscriptionPlan} plan allows ${hrAccountLimit} HR account(s). Upgrade your plan to add more HR users.`);
  }
};


