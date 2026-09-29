import mongoose from "mongoose";

import warehouseTransferRepository
  from "../repositories/warehouseTransfer.repository.js";

import warehouseRepository
  from "../repositories/warehouse.repository.js";

import warehouseItemRepository
  from "../repositories/warehouseItem.repository.js";

import warehouseItemService
  from "./warehouseItem.service.js";
import warehouseActivityService
  from "./warehouseActivity.service.js";

import { ApiError }
  from "../utils/apiError.js";

class WarehouseTransferService {
  async createTransfer({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      payload.fromWarehouseId,
      "Invalid source warehouse ID"
    );

    this.assertObjectId(
      payload.toWarehouseId,
      "Invalid destination warehouse ID"
    );

    if (
      String(payload.fromWarehouseId) ===
      String(payload.toWarehouseId)
    ) {
      throw new ApiError(
        400,
        "Source and destination warehouses must be different"
      );
    }

    const fromWarehouse =
      await warehouseRepository.findById({
        companyId,
        warehouseId: payload.fromWarehouseId,
      });

    if (!fromWarehouse) {
      throw new ApiError(
        404,
        "Source warehouse not found"
      );
    }

    const toWarehouse =
      await warehouseRepository.findById({
        companyId,
        warehouseId: payload.toWarehouseId,
      });

    if (!toWarehouse) {
      throw new ApiError(
        404,
        "Destination warehouse not found"
      );
    }

    this.assertObjectId(
      payload.fromItemId,
      "Invalid source item ID"
    );

    const fromItem =
      await warehouseItemRepository.findById({
        companyId,
        itemId: payload.fromItemId,
      });

    if (!fromItem) {
      throw new ApiError(
        404,
        "Source item not found"
      );
    }

    if (
      String(fromItem.warehouseId) !==
      String(payload.fromWarehouseId)
    ) {
      throw new ApiError(
        400,
        "Source item does not belong to the selected source warehouse"
      );
    }

    const quantity = Number(
      payload.quantity || 0
    );

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(
        400,
        "Quantity must be greater than zero"
      );
    }

    const available = Number(
      fromItem.availableQuantity || 0
    );

    if (quantity > available) {
      throw new ApiError(
        400,
        "Insufficient quantity in source warehouse"
      );
    }

    let toItemId = payload.toItemId || null;

    if (toItemId) {
      this.assertObjectId(
        toItemId,
        "Invalid destination item ID"
      );

      const toItem =
        await warehouseItemRepository.findById({
          companyId,
          itemId: toItemId,
        });

      if (!toItem) {
        throw new ApiError(
          404,
          "Destination item not found"
        );
      }

      if (
        String(toItem.warehouseId) !==
        String(payload.toWarehouseId)
      ) {
        throw new ApiError(
          400,
          "Destination item does not belong to the selected destination warehouse"
        );
      }
    } else {
      const existing =
        await warehouseItemRepository.findBySku({
          companyId,
          warehouseId: payload.toWarehouseId,
          sku: fromItem.sku,
        });

      if (existing) {
        toItemId = existing._id;
      } else {
        const created =
          await warehouseItemRepository.create({
            companyId,

            warehouseId: payload.toWarehouseId,

            productName: fromItem.productName,

            sku: fromItem.sku,

            unit: fromItem.unit || "unit",

            availableQuantity: 0,
            reservedQuantity: 0,
            damagedQuantity: 0,
            reorderLevel: fromItem.reorderLevel || 0,

            status: "out_of_stock",

            remarks: "",

            createdBy: userId,
            createdByEmployeeId: employeeId,
            updatedBy: userId,
          });

        toItemId = created._id;
      }
    }

    return warehouseTransferRepository.create({
      companyId,

      fromWarehouseId: payload.fromWarehouseId,

      toWarehouseId: payload.toWarehouseId,

      productName: fromItem.productName,

      sku: fromItem.sku,

      fromItemId: fromItem._id,

      toItemId,

      quantity,

      unit: fromItem.unit || "unit",

      transferDate:
        payload.transferDate
          ? new Date(payload.transferDate)
          : new Date(),

      remarks: payload.remarks || "",

      status: "pending",

      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listTransfers({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseTransferRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getTransfer({
    companyId,
    transferId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      transferId,
      "Invalid transfer ID"
    );

    const record =
      await warehouseTransferRepository
        .findById({
          companyId,
          transferId,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Transfer record not found"
      );
    }

    return record;
  }

  async complete({
    companyId,
    transferId,
    userId = null,
    employeeId = null,
  }) {
    const current = await this.getTransfer({
      companyId,
      transferId,
    });

    if (current.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending transfers can be completed"
      );
    }

    const quantity = Number(
      current.quantity || 0
    );

    await warehouseItemService.adjustQuantity({
      companyId,
      itemId: current.fromItemId,
      userId,
      operation: "remove",
      quantity,
      reason:
        `Transfer out: ${current._id}`,
    });

    try {
      await warehouseItemService.adjustQuantity(
        {
          companyId,
          itemId: current.toItemId,
          userId,
          operation: "add",
          quantity,
          reason:
            `Transfer in: ${current._id}`,
        }
      );
    } catch (error) {
      try {
        await warehouseItemService.adjustQuantity(
          {
            companyId,
            itemId: current.fromItemId,
            userId,
            operation: "add",
            quantity,
            reason:
              `Transfer rollback: ${current._id}`,
          }
        );
      } catch (rollbackError) {
        console.error(
          "[warehouseTransfer.complete] rollback failed",
          {
            transferId: String(current._id),
            rollbackError,
          }
        );
      }

      throw error;
    }

    const record =
      await warehouseTransferRepository
        .updateById({
          companyId,
          transferId,
          payload: {
            status: "completed",
            completedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Transfer record not found"
      );
    }
    await warehouseActivityService.record({
      companyId,
      warehouseId: record.fromWarehouseId,
      itemId: record.fromItemId,
      type: "stock_transferred",
      productName: record.productName,
      sku: record.sku,
      quantity: record.quantity,
      unit: record.unit,
      employeeId,
      userId,
      referenceType: "transfer",
      referenceId: record._id,
      referenceNumber:
        String(record._id || ""),
      notes:
        `To warehouse: ${String(record.toWarehouseId || "")}`,
      occurredAt: record.completedAt,
    });

    return record;
  }

  async cancel({
    companyId,
    transferId,
    userId = null,
  }) {
    const current = await this.getTransfer({
      companyId,
      transferId,
    });

    if (current.status !== "pending") {
      throw new ApiError(
        400,
        "Only pending transfers can be cancelled"
      );
    }

    const record =
      await warehouseTransferRepository
        .updateById({
          companyId,
          transferId,
          payload: {
            status: "cancelled",
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Transfer record not found"
      );
    }

    return record;
  }

  async deleteTransfer({
    companyId,
    transferId,
    userId = null,
  }) {
    const current = await this.getTransfer({
      companyId,
      transferId,
    });

    if (current.status === "completed") {
      throw new ApiError(
        400,
        "Completed transfers cannot be deleted"
      );
    }

    await warehouseTransferRepository.softDelete({
      companyId,
      transferId,
      userId,
    });

    return {
      transferId: current._id,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseTransferRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "pending":
          summary.pending = count;
          break;
        case "completed":
          summary.completed = count;
          break;
        case "cancelled":
          summary.cancelled = count;
          break;
        default:
          break;
      }
    }

    return summary;
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

export const warehouseTransferService =
  new WarehouseTransferService();

export default warehouseTransferService;