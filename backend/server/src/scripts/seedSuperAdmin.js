import mongoose from "mongoose";

import { env } from "../config/env.js";
import { Role, ROLE_LEVEL } from "../models/Role.js";
import { User } from "../models/User.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

const run = async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required.");
  }

  await mongoose.connect(env.MONGO_URI);

  const role = await Role.findOneAndUpdate(
    { name: "super_admin", company: null },
    {
      $setOnInsert: { name: "super_admin", company: null },
      $set: {
        level: ROLE_LEVEL.SUPER_ADMIN,
        permissions: ["manage_all_companies", "manage_all_users"],
        isCustom: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = new User({
      name: process.env.SUPER_ADMIN_NAME || "Platform Super Admin",
      email,
      role: ROLES.SUPER_ADMIN,
      roleRef: role._id,
      permissions: role.permissions,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      forcePasswordChange: false,
      isPlatformUser: true,
    });
    await user.setPassword(password);
  } else {
    user.role = ROLES.SUPER_ADMIN;
    user.roleRef = role._id;
    user.permissions = role.permissions;
    user.isPlatformUser = true;
  }

  await user.save();
  console.log(`Super admin ready: ${email}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});

