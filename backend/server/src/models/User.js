import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

import { env } from "../config/env.js";
import { ROLE_PERMISSIONS, ROLES, USER_STATUS } from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    isPlatformUser: {
      type: Boolean,
      default: false,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    mobile: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },

    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.EMPLOYEE,
    },

    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
      index: true,
    },

    permissions: {
      type: [String],
      default: [],
    },

    employeeCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    departmentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      trim: true,
      default: "",
    },

    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },

    forcePasswordChange: {
      type: Boolean,
      default: true,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    resetPasswordTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    unlockTokenHash: {
      type: String,
      select: false,
      default: null,
    },

    unlockTokenExpiresAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * IMPORTANT FIX:
 * Do not call next() here unless next is declared.
 * This hook is synchronous, so use this.invalidate() instead.
 */
userSchema.pre("validate", async function () {
  if (this.role === ROLES.SUPER_ADMIN) {
    this.companyId = null;
    this.isPlatformUser = true;
    return;
  }

  this.isPlatformUser = false;

  if (!this.companyId) {
    this.invalidate("companyId", "Company is required for non-platform users.");
  }
});

userSchema.pre("save", async function () {
  if (!this.permissions || this.permissions.length === 0) {
    this.permissions = ROLE_PERMISSIONS[this.role] || [];
  }
});

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  this.passwordChangedAt = new Date();
};

userSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

userSchema.methods.createSecureToken = function (
  fieldName,
  expiryFieldName,
  minutes = 15
) {
  const token = crypto.randomBytes(32).toString("hex");

  this[fieldName] = crypto.createHash("sha256").update(token).digest("hex");

  this[expiryFieldName] = new Date(Date.now() + minutes * 60 * 1000);

  return token;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();

  delete obj.passwordHash;
  delete obj.resetPasswordTokenHash;
  delete obj.emailVerificationTokenHash;
  delete obj.unlockTokenHash;
  delete obj.__v;

  return obj;
};

userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, status: 1 });
userSchema.index({ companyId: 1, employeeCode: 1 }, { sparse: true });

export const User = mongoose.model("User", userSchema);

