import Joi from "joi";

import {
  WAREHOUSE_TASK_PRIORITIES,
  WAREHOUSE_TASK_STATUSES,
} from "../models/WarehouseTask.js";

const optionalString = Joi
  .string()
  .trim()
  .allow("", null);

export const createWarehouseTaskSchema =
  Joi.object({
    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    title: Joi
      .string()
      .trim()
      .min(2)
      .max(200)
      .required(),

    description: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),

    assignedToEmployeeId: Joi
      .string()
      .trim()
      .allow("", null),

    priority: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_PRIORITIES)
      .default("normal"),

    dueDate: Joi
      .date()
      .allow(null),

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const updateWarehouseTaskSchema =
  Joi.object({
    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    title: Joi
      .string()
      .trim()
      .min(2)
      .max(200),

    description: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),

    assignedToEmployeeId: Joi
      .string()
      .trim()
      .allow("", null),

    priority: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_PRIORITIES),

    dueDate: Joi
      .date()
      .allow(null),

    remarks: Joi
      .string()
      .trim()
      .allow("", null)
      .max(3000),
  });

export const warehouseTaskQuerySchema =
  Joi.object({
    page: Joi
      .number()
      .integer()
      .min(1)
      .default(1),

    limit: Joi
      .number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    search: Joi
      .string()
      .trim()
      .allow("", null),

    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    status: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_STATUSES)
      .allow("", null),

    priority: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_PRIORITIES)
      .allow("", null),

    assignedToEmployeeId: Joi
      .string()
      .trim()
      .allow("", null),

    overdue: Joi
      .boolean()
      .default(false),

    sortBy: Joi
      .string()
      .trim()
      .valid(
        "createdAt",
        "updatedAt",
        "dueDate",
        "priority",
        "status",
        "title"
      )
      .default("createdAt"),

    sortOrder: Joi
      .string()
      .trim()
      .lowercase()
      .valid("asc", "desc")
      .default("desc"),
  });

export const warehouseMyTasksQuerySchema =
  Joi.object({
    page: Joi
      .number()
      .integer()
      .min(1)
      .default(1),

    limit: Joi
      .number()
      .integer()
      .min(1)
      .max(100)
      .default(20),

    search: Joi
      .string()
      .trim()
      .allow("", null),

    warehouseId: Joi
      .string()
      .trim()
      .allow("", null),

    status: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_STATUSES)
      .allow("", null),

    priority: Joi
      .string()
      .trim()
      .lowercase()
      .valid(...WAREHOUSE_TASK_PRIORITIES)
      .allow("", null),

    overdue: Joi
      .boolean()
      .default(false),

    sortBy: Joi
      .string()
      .trim()
      .valid(
        "createdAt",
        "updatedAt",
        "dueDate",
        "priority",
        "status",
        "title"
      )
      .default("dueDate"),

    sortOrder: Joi
      .string()
      .trim()
      .lowercase()
      .valid("asc", "desc")
      .default("asc"),
  });