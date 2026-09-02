import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

import {
  createUserSchema,
  updateUserSchema,
  changeRoleSchema,
  resetPasswordSchema,
  assignPermissionsSchema,
} from "../validators/user.validator.js";

import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  blockUserService,
  unblockUserService,
  resetUserPasswordService,
  changeRoleService,
  assignPermissionsService,
} from "../services/user.service.js";

// POST /users
export const createUser = asyncHandler(async (req, res) => {
  const { value, error } = createUserSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const user = await createUserService(req.user, value);

  res.status(201).json(new ApiResponse(201, user, "User created successfully"));
});

// GET /users
export const getUsers = asyncHandler(async (req, res) => {
  const result = await getUsersService(req.user, req.query);

  res.status(200).json(new ApiResponse(200, result, "Users fetched successfully"));
});

// GET /users/:id
export const getUserById = asyncHandler(async (req, res) => {
  const user = await getUserByIdService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// PATCH /users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { value, error } = updateUserSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const user = await updateUserService(req.user, req.params.id, value);

  res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

// DELETE /users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  await deleteUserService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

// PATCH /users/:id/block
export const blockUser = asyncHandler(async (req, res) => {
  const user = await blockUserService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, user, "User blocked successfully"));
});

// PATCH /users/:id/unblock
export const unblockUser = asyncHandler(async (req, res) => {
  const user = await unblockUserService(req.user, req.params.id);

  res.status(200).json(new ApiResponse(200, user, "User unblocked successfully"));
});


export const resetUserPassword = asyncHandler(async (req, res) => {
  const { value, error } = resetPasswordSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const result = await resetUserPasswordService(
    req.user,
    req.params.id,
    value.password,
    {
      sendEmail: value.sendEmail,
    }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      result.emailSent
        ? "Password reset successfully and email sent to user."
        : "Password reset successfully. Email was not sent."
    )
  );
});

// PATCH /users/:id/change-role
export const changeUserRole = asyncHandler(async (req, res) => {
  const { value, error } = changeRoleSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const user = await changeRoleService(req.user, req.params.id, value.role);

  res.status(200).json(new ApiResponse(200, user, "Role updated successfully"));
});

// PATCH /users/:id/permissions
export const assignPermissions = asyncHandler(async (req, res) => {
  const { value, error } = assignPermissionsSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const user = await assignPermissionsService(req.user, req.params.id, value.permissions);

  res.status(200).json(new ApiResponse(200, user, "Permissions updated successfully"));
});