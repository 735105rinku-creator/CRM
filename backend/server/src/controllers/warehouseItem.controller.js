import { ROLES } from "../constants/roles.js";

import {
  createWarehouseItemSchema,
  updateWarehouseItemSchema,
  adjustWarehouseItemQuantitySchema,
  warehouseItemQuerySchema,
} from "../validators/warehouseItem.validator.js";

import warehouseItemService
  from "../services/warehouseItem.service.js";

import warehouseActivityService
  from "../services/warehouseActivity.service.js";

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

export const createWarehouseItem =
  asyncHandler(async (req, res) => {
    const payload = validate(
      createWarehouseItemSchema,
      req.body
    );

    const result =
      await warehouseItemService.createItem({
        companyId:
          companyIdForRequest(req),

        userId:
          req.user?._id || null,

        employeeId:
          req.warehouseAccess?.employeeId ||
          null,

        payload,
      });

    res.status(201).json(
      new ApiResponse(
        201,
        result,
        "Warehouse item created successfully"
      )
    );
  });

export const getWarehouseItems =
  asyncHandler(async (req, res) => {
    const query = validate(
      warehouseItemQuerySchema,
      req.query
    );

    const result =
      await warehouseItemService.listItems({
        companyId:
          companyIdForRequest(req),
        query,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse items fetched successfully"
      )
    );
  });

export const getWarehouseItemSummary =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseItemService.getSummary({
        companyId:
          companyIdForRequest(req),
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse item summary fetched successfully"
      )
    );
  });

export const getWarehouseItemById =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseItemService.getItem({
        companyId:
          companyIdForRequest(req),

        itemId:
          req.params.id,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse item fetched successfully"
      )
    );
  });

export const updateWarehouseItem =
  asyncHandler(async (req, res) => {
    const payload = validate(
      updateWarehouseItemSchema,
      req.body
    );

    const result =
      await warehouseItemService.updateItem({
        companyId:
          companyIdForRequest(req),

        itemId:
          req.params.id,

        userId:
          req.user?._id || null,

        payload,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse item updated successfully"
      )
    );
  });

export const adjustWarehouseItemQuantity =
  asyncHandler(async (req, res) => {
    const payload = validate(
      adjustWarehouseItemQuantitySchema,
      req.body
    );

      const result =
      await warehouseItemService.adjustQuantity(
        {
          companyId:
            companyIdForRequest(req),

          itemId:
            req.params.id,

          userId:
            req.user?._id || null,

          operation: payload.operation,
          quantity: payload.quantity,
          reason: payload.reason || "",
        }
      );

    if (
      payload.operation === "add" ||
      payload.operation === "remove"
    ) {
      const activityType =
        payload.operation === "add"
          ? "stock_added"
          : "stock_removed";

      await warehouseActivityService.record({
        companyId:
          companyIdForRequest(req),
        warehouseId: result.warehouseId,
        itemId: result._id,
        type: activityType,
        productName: result.productName,
        sku: result.sku,
        quantity: Number(payload.quantity || 0),
        unit: result.unit,
        employeeId:
          req.warehouseAccess?.employeeId || null,
        userId: req.user?._id || null,
        referenceType: "item_adjustment",
        referenceId: result._id,
        referenceNumber: "",
        notes: payload.reason || "",
        occurredAt: new Date(),
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse item quantity updated successfully"
      )
    );
  });

export const deleteWarehouseItem =
  asyncHandler(async (req, res) => {
    const result =
      await warehouseItemService.deleteItem({
        companyId:
          companyIdForRequest(req),

        itemId:
          req.params.id,

        userId:
          req.user?._id || null,
      });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Warehouse item deleted successfully"
      )
    );
  });