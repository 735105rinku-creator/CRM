import mongoose from "mongoose";

import warehouseItemRepository
  from "../repositories/warehouseItem.repository.js";

import warehouseRepository
  from "../repositories/warehouse.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class WarehouseItemService {
  async createItem({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      payload.warehouseId,
      "Invalid warehouse ID"
    );

    const warehouse =
      await warehouseRepository.findById({
        companyId,
        warehouseId: payload.warehouseId,
      });

    if (!warehouse) {
      throw new ApiError(
        404,
        "Warehouse not found"
      );
    }

    const sku = String(payload.sku || "")
      .trim()
      .toUpperCase();

    const existing =
      await warehouseItemRepository.findBySku({
        companyId,
        warehouseId: payload.warehouseId,
        sku,
      });

    if (existing) {
      throw new ApiError(
        409,
        "SKU already exists in this warehouse"
      );
    }

    const availableQuantity = Number(
      payload.availableQuantity || 0
    );
    const reservedQuantity = Number(
      payload.reservedQuantity || 0
    );
    const damagedQuantity = Number(
      payload.damagedQuantity || 0
    );
    const reorderLevel = Number(
      payload.reorderLevel || 0
    );

    const status = this.deriveStatus({
      availableQuantity,
      reservedQuantity,
      damagedQuantity,
      reorderLevel,
    });

    return warehouseItemRepository.create({
      companyId,

      warehouseId: payload.warehouseId,

      productName: payload.productName,

      sku,

      unit: payload.unit || "unit",

      availableQuantity,
      reservedQuantity,
      damagedQuantity,
      reorderLevel,
      status,

      remarks: payload.remarks || "",

      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listItems({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseItemRepository.paginate({
      companyId,
      ...query,
    });
  }

  async getItem({
    companyId,
    itemId,
  }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(
      itemId,
      "Invalid item ID"
    );

    const record =
      await warehouseItemRepository.findById({
        companyId,
        itemId,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    return record;
  }

  async updateItem({
    companyId,
    itemId,
    userId = null,
    payload,
  }) {
    await this.getItem({
      companyId,
      itemId,
    });

    const update = {
      updatedBy: userId,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "productName"
      )
    ) {
      update.productName =
        payload.productName;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "unit"
      )
    ) {
      update.unit = payload.unit;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "reorderLevel"
      )
    ) {
      update.reorderLevel = Number(
        payload.reorderLevel || 0
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "remarks"
      )
    ) {
      update.remarks =
        payload.remarks || "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "sku"
      )
    ) {
      const sku = String(payload.sku || "")
        .trim()
        .toUpperCase();

      const existing =
        await warehouseItemRepository.findBySku(
          {
            companyId,
            warehouseId:
              payload.warehouseId,
            sku,
          }
        );

      if (
        existing &&
        String(existing._id) !==
          String(itemId)
      ) {
        throw new ApiError(
          409,
          "SKU already exists in this warehouse"
        );
      }

      update.sku = sku;
    }

    const record =
      await warehouseItemRepository.updateById({
        companyId,
        itemId,
        payload: update,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        update,
        "reorderLevel"
      )
    ) {
      const next = this.deriveStatus({
        availableQuantity:
          record.availableQuantity || 0,
        reservedQuantity:
          record.reservedQuantity || 0,
        damagedQuantity:
          record.damagedQuantity || 0,
        reorderLevel:
          update.reorderLevel,
      });

      if (next !== record.status) {
        return warehouseItemRepository.updateById(
          {
            companyId,
            itemId,
            payload: {
              status: next,
            },
          }
        );
      }
    }

    return record;
  }

  async adjustQuantity({
    companyId,
    itemId,
    userId = null,
    operation,
    quantity,
    reason = "",
  }) {
    const current = await this.getItem({
      companyId,
      itemId,
    });

    const amount = Number(quantity || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(
        400,
        "Quantity must be greater than zero"
      );
    }

    let field = null;
    let delta = 0;

    switch (operation) {
      case "add":
        field = "availableQuantity";
        delta = amount;
        break;

      case "remove":
        field = "availableQuantity";
        delta = -amount;
        break;

      case "adjust":
        field = "availableQuantity";
        delta =
          amount -
          Number(current.availableQuantity || 0);
        break;

      case "damage":
        field = "damagedQuantity";
        delta = amount;
        break;

      default:
        throw new ApiError(
          400,
          "Invalid quantity operation"
        );
    }

    if (
      operation !== "adjust" &&
      operation !== "damage" &&
      Number(current[field] || 0) + delta < 0
    ) {
      throw new ApiError(
        400,
        "Insufficient quantity"
      );
    }

    const after = await warehouseItemRepository.adjustQuantity(
      {
        companyId,
        itemId,
        field,
        delta,
      }
    );

    if (!after) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    const nextStatus = this.deriveStatus({
      availableQuantity:
        after.availableQuantity || 0,
      reservedQuantity:
        after.reservedQuantity || 0,
      damagedQuantity:
        after.damagedQuantity || 0,
      reorderLevel:
        after.reorderLevel || 0,
    });

    if (nextStatus !== after.status) {
      const trimmedReason = String(
        reason || ""
      ).trim();

      const remarks = trimmedReason
        ? (
            String(after.remarks || "").trim()
              ? `${after.remarks}\n${trimmedReason}`
              : trimmedReason
          )
        : after.remarks;

      return warehouseItemRepository.updateById(
        {
          companyId,
          itemId,
          payload: {
            status: nextStatus,
            remarks,
            updatedBy: userId,
          },
        }
      );
    }

    return after;
  }

  async deleteItem({
    companyId,
    itemId,
    userId = null,
  }) {
    const current = await this.getItem({
      companyId,
      itemId,
    });

    await warehouseItemRepository.softDelete({
      companyId,
      itemId,
      userId,
    });

    return {
      itemId: current._id,
      sku: current.sku,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseItemRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      reserved: 0,
      damaged: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "in_stock":
          summary.inStock = count;
          break;
        case "low_stock":
          summary.lowStock = count;
          break;
        case "out_of_stock":
          summary.outOfStock = count;
          break;
        case "reserved":
          summary.reserved = count;
          break;
        case "damaged":
          summary.damaged = count;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  deriveStatus({
    availableQuantity,
    reservedQuantity,
    damagedQuantity,
    reorderLevel,
  }) {
    const available = Number(
      availableQuantity || 0
    );
    const reserved = Number(
      reservedQuantity || 0
    );
    const damaged = Number(
      damagedQuantity || 0
    );
    const reorder = Number(
      reorderLevel || 0
    );

    if (
      available === 0 &&
      reserved === 0 &&
      damaged > 0
    ) {
      return "damaged";
    }

    if (
      available === 0 &&
      reserved === 0 &&
      damaged === 0
    ) {
      return "out_of_stock";
    }

    if (
      available === 0 &&
      reserved > 0
    ) {
      return "reserved";
    }

    if (
      reorder > 0 &&
      available <= reorder
    ) {
      return "low_stock";
    }

    return "in_stock";
  }

  assertCompanyId(companyId) {
    if (
      !companyId ||
      !mongoose.isValidObjectId(companyId)
    ) {
      throw new ApiError(
        400,
        "Invalid company ID"
      );
    }
  }

  assertObjectId(value, message) {
    if (!mongoose.isValidObjectId(value)) {
      throw new ApiError(400, message);
    }
  }
}

export const warehouseItemService =
  new WarehouseItemService();

export default warehouseItemService;