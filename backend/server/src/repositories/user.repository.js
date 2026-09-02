import { User } from "../models/User.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

export const countActiveCompanyAdmins = async (companyId) => {
  return User.countDocuments({
    companyId,
    role: ROLES.COMPANY_ADMIN,
    status: USER_STATUS.ACTIVE,
  });
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (id) => {
  return User.findById(id);
};

export const findUserByIdWithPassword = async (id) => {
  return User.findById(id).select("+passwordHash");
};

export const createUserRecord = async (payload) => {
  return User.create(payload);
};

export const updateUserById = async (id, payload) => {
  return User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteUserById = async (id) => {
  return User.findByIdAndDelete(id);
};

export const listUsers = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("companyId", "companyName companyCode logo status")
      .select(
        "-passwordHash -resetPasswordTokenHash -emailVerificationTokenHash -unlockTokenHash"
      )
      .lean(),

    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
