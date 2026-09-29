import { ROLES } from "../constants/roles.js";

import {
  createWarehouseTaskSchema,
  updateWarehouseTaskSchema,
  warehouseTaskQuerySchema,
  warehouseMyTasksQuerySchema,
} from "../validators/warehouseTask.validator.js";

import warehouseTaskService
  from "../services/warehouseTask.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

const companyIdForRequest = (req) => {
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;

  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    if (!authCompanyId) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    return authCompanyId;
  }

  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;

  if (!requestedCompanyId) {
    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }

  return requestedCompanyId;
};

function validate(schema, source) {
  const { value, error } = schema.validate(
    source,
    {
      abortEarly: false,
      stripUnknown: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details[0].message,
      error.details
    );
  }

  return value;
}

const accessContextFrom = (req) => ({
  userId: req.user?._id || null,
  employeeId:
    req.warehouseAccess?.employeeId || null,
  accessType:
    req.warehouseAccess?.accessType || "employee",
});

export const createWarehouseTask =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseTaskSchema,
      req.body
    );

    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.createTask({
        companyId:
          companyIdForRequest(req),

        userId: ctx.userId,
        employeeId: ctx.employeeId,
        accessType: ctx.accessType,

        payload,
      });

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Task created successfully"
      )
    );
  });

export const getWarehouseTasks =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseTaskQuerySchema,
      req.query
    );

    const result =
      await warehouseTaskService.listTasks({
        companyId:
          companyIdForRequest(req),
        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Tasks fetched successfully"
      )
    );
  });

export const getMyWarehouseTasks =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseMyTasksQuerySchema,
      req.query
    );

    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.listMyTasks({
        companyId:
          companyIdForRequest(req),

        employeeId: ctx.employeeId,

        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "My tasks fetched successfully"
      )
    );
  });

export const getWarehouseTaskSummary =
  asyncHandler(async (req, res) => {
    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.getSummary({
        companyId:
          companyIdForRequest(req),

        employeeId: ctx.employeeId,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task summary fetched successfully"
      )
    );
  });

export const getWarehouseTaskById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseTaskService.getTask({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task fetched successfully"
      )
    );
  });

export const updateWarehouseTask =
  asyncHandler(async (req, res) => {
    const payload = validate(
      updateWarehouseTaskSchema,
      req.body
    );

    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.updateTask({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,

        userId: ctx.userId,
        employeeId: ctx.employeeId,
        accessType: ctx.accessType,

        payload,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task updated successfully"
      )
    );
  });

export const startWarehouseTask =
  asyncHandler(async (req, res) => {
    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.start({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,

        userId: ctx.userId,
        employeeId: ctx.employeeId,
        accessType: ctx.accessType,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task started"
      )
    );
  });

export const completeWarehouseTask =
  asyncHandler(async (req, res) => {
    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.complete({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,

        userId: ctx.userId,
        employeeId: ctx.employeeId,
        accessType: ctx.accessType,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task completed"
      )
    );
  });

export const cancelWarehouseTask =
  asyncHandler(async (req, res) => {
    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.cancel({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,

        userId: ctx.userId,
        employeeId: ctx.employeeId,
        accessType: ctx.accessType,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task cancelled"
      )
    );
  });

export const deleteWarehouseTask =
  asyncHandler(async (req, res) => {
    const ctx = accessContextFrom(req);

    const result =
      await warehouseTaskService.deleteTask({
        companyId:
          companyIdForRequest(req),

        taskId:
          req.params.id,

        userId: ctx.userId,
        accessType: ctx.accessType,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Task deleted successfully"
      )
    );
  });