import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
import { env } from "../config/env.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { ROLES, USER_STATUS, ROLE_PERMISSIONS,COMPANY_STATUS,
  SUBSCRIPTION_STATUS, } from "../constants/roles.js";
import { sendVerificationEmail } from "./email.service.js";

const generateEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
};

const parseEmployeeCapacity = (employeeCount) => {
  const value = String(employeeCount || "").trim();

  if (!value) return 10;
  if (value.includes("+")) return Number.parseInt(value, 10) || 10;
  if (value.includes("-")) {
    const upperLimit = value.split("-").pop();
    return Number.parseInt(upperLimit, 10) || 10;
  }

  return Number.parseInt(value, 10) || 10;
};

const joinPhone = (countryCode, mobile) => {
  const code = String(countryCode || "+91").trim();
  const number = String(mobile || "").trim();

  if (!number) return "";
  if (number.startsWith("+")) return number;

  return `${code} ${number}`.trim();
};

export const registerCompanyService = async (payload) => {
  const existingCompany = await Company.findOne({
    $or: [
      { companyCode: payload.companyCode.toUpperCase() },
      { email: payload.companyEmail.toLowerCase() },
    ],
  });

  if (existingCompany) {
    throw new ApiError(409, "Company already exists with this code or email.");
  }

  const existingUser = await User.findOne({
    email: payload.adminEmail.toLowerCase(),
  });

  if (existingUser) {
    throw new ApiError(409, "Admin email already exists.");
  }

  const company = await Company.create({
    companyName: payload.companyName,
    companyCode: payload.companyCode.toUpperCase(),
    email: payload.companyEmail.toLowerCase(),
    phone: joinPhone(payload.companyCountryCode, payload.companyPhone),
    status: COMPANY_STATUS.ACTIVE,
    subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
    createdBy: null,
    panNumber: payload.companyPan || "",
    gstNumber: payload.companyGst || "",
    industry: payload.industry || "",
    maxEmployees: parseEmployeeCapacity(payload.employeeCount),
    website: payload.website || "",
    logo: payload.logo || "",
    address: {
      addressLine1: payload.registeredAddress || "",
      country: payload.country || "India",
    },
  });

  const verification = generateEmailVerificationToken();

  const admin = new User({
    companyId: company._id,
    isPlatformUser: false,
    name: payload.adminName,
    email: payload.adminEmail.toLowerCase(),
    mobile: joinPhone(payload.adminCountryCode, payload.adminMobile),
    profileImage: payload.logo || "",
    role: ROLES.COMPANY_ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.COMPANY_ADMIN] || [],
    status: USER_STATUS.ACTIVE,
    isEmailVerified: true,
    emailVerificationTokenHash: verification.tokenHash,
    emailVerificationExpiresAt: verification.expiresAt,
    forcePasswordChange: false,
    createdBy: null,
  });

  await admin.setPassword(payload.password);
  await admin.save();

  const verifyUrl = `${env.CLIENT_ORIGIN}/verify-email?token=${verification.token}`;

  let verificationEmailSent = false;
  let emailWarning = null;

  try {
    await sendVerificationEmail({
      to: admin.email,
      name: admin.name,
      verifyUrl,
      companyDetails: {
        companyName: company.companyName,
        companyCode: company.companyCode,
        adminName: admin.name,
        adminMobile: admin.mobile,
        companyPhone: company.phone,
        country: company.address?.country || payload.country || "India",
      },
    });
    verificationEmailSent = true;
  } catch (emailError) {
    emailWarning =
      "Company registered, but verification email could not be sent. Please check SMTP credentials and resend verification email.";

    console.error("[registerCompany] Verification email failed:", {
      to: admin.email,
      code: emailError.code,
      command: emailError.command,
      responseCode: emailError.responseCode,
      message: emailError.message,
    });
  }

  return {
    company: {
      id: company._id,
      companyName: company.companyName,
      companyCode: company.companyCode,
      status: company.status,
      logo: company.logo,
    },
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isEmailVerified: admin.isEmailVerified,
    },
    message: "Company registered successfully. You can now login with your admin credentials.",
    verificationEmailSent,
    ...(emailWarning ? { emailWarning } : {}),
    ...(env.NODE_ENV !== "production" ? { verificationUrl: verifyUrl } : {}),
  };
};



