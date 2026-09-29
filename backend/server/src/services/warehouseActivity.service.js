import mongoose from "mongoose";

import warehouseActivityRepository
  from "../repositories/warehouseActivity.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class WarehouseActivityService {
  async record({
    companyId,
    warehouseId = null,
    itemId = null,
    type,
    productName = "",
    sku = "",
    quantity = 0,
    unit = "unit",
    employeeId = null,
    userId = null,
    referenceType = "",
    referenceId = null,
    referenceNumber = "",
    notes = "",
    occurredAt = null,
  }) {
    if (!companyId) {
      return null;
    }

    if (!type) {
      return null;
    }

    try {
      return await warehouseActivityRepository.create({
        companyId,

        warehouseId: warehouseId || null,

        itemId: itemId || null,

        type,

        productName: productName || "",

        sku: sku
          ? String(sku).trim().toUpperCase()
          : "",

        quantity: Number(quantity || 0),

        unit: unit || "unit",

        employeeId: employeeId || null,

        userId: userId || null,

        referenceType: referenceType || "",

        referenceId: referenceId || null,

        referenceNumber: referenceNumber || "",

        notes: notes || "",

        occurredAt: occurredAt
          ? new Date(occurredAt)
          : new Date(),

        createdBy: userId || null,

        createdByEmployeeId: employeeId || null,
      });
    } catch (error) {
      console.error(
        "[warehouseActivity.record] write failed",
        {
          type,
          companyId: String(companyId || ""),
          error,
        }
      );

      return null;
    }
  }

  async listActivity({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseActivityRepository.paginate({
      companyId,
      ...query,
    });
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseActivityRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      goodsReceived: 0,
      goodsDispatched: 0,
      stockAdded: 0,
      stockRemoved: 0,
      stockTransferred: 0,
      damagedGoodsReported: 0,
      warehouseCreated: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "goods_received":
          summary.goodsReceived = count;
          break;
        case "goods_dispatched":
          summary.goodsDispatched = count;
          break;
        case "stock_added":
          summary.stockAdded = count;
          break;
        case "stock_removed":
          summary.stockRemoved = count;
          break;
        case "stock_transferred":
          summary.stockTransferred = count;
          break;
        case "damaged_goods_reported":
          summary.damagedGoodsReported = count;
          break;
        case "warehouse_created":
          summary.warehouseCreated = count;
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
}

export const warehouseActivityService =
  new WarehouseActivityService();

export default warehouseActivityService;