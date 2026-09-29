import mongoose from "mongoose";

import warehouseIncomingRepository
  from "../repositories/warehouseIncoming.repository.js";

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

class WarehouseIncomingService {
  async createIncoming({
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

    const shipmentNumber = String(
      payload.shipmentNumber || ""
    )
      .trim()
      .toUpperCase();

    const existing =
      await warehouseIncomingRepository
        .findByShipmentNumber({
          companyId,
          shipmentNumber,
        });

    if (existing) {
      throw new ApiError(
        409,
        "Shipment number already exists"
      );
    }

    if (payload.itemId) {
      this.assertObjectId(
        payload.itemId,
        "Invalid item ID"
      );

      const item =
        await warehouseItemRepository.findById(
          {
            companyId,
            itemId: payload.itemId,
          }
        );

      if (!item) {
        throw new ApiError(
          404,
          "Warehouse item not found"
        );
      }

      if (
        String(item.warehouseId) !==
        String(payload.warehouseId)
      ) {
        throw new ApiError(
          400,
          "Item does not belong to the selected warehouse"
        );
      }
    }

    return warehouseIncomingRepository.create({
      companyId,

      warehouseId: payload.warehouseId,

      shipmentNumber,

      referenceType:
        payload.referenceType || "supplier",

      referenceTypeOther:
        payload.referenceType === "other"
          ? payload.referenceTypeOther || ""
          : "",

      referenceNumber:
        payload.referenceNumber || "",

      supplierName: payload.supplierName,

      productName: payload.productName,

      sku: String(payload.sku || "")
        .trim()
        .toUpperCase(),

      itemId: payload.itemId || null,

      quantity: Number(payload.quantity || 0),

      unit: payload.unit || "unit",

      arrivalDate:
        payload.arrivalDate
          ? new Date(payload.arrivalDate)
          : new Date(),

      condition:
        payload.condition || "good",

      conditionOther:
        payload.condition === "other"
          ? payload.conditionOther || ""
          : "",

      remarks: payload.remarks || "",

      status: "expected",

      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listIncoming({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseIncomingRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getIncoming({
    companyId,
    incomingId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      incomingId,
      "Invalid incoming ID"
    );

    const record =
      await warehouseIncomingRepository
        .findById({
          companyId,
          incomingId,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Incoming record not found"
      );
    }

    return record;
  }

  async updateIncoming({
    companyId,
    incomingId,
    userId = null,
    payload,
  }) {
    const current = await this.getIncoming({
      companyId,
      incomingId,
    });

    if (current.status !== "expected") {
      const allowed = new Set([
        "remarks",
      ]);

      const keys = Object.keys(payload);

      const onlyRemarks = keys.every((key) =>
        allowed.has(key)
      );

      if (!onlyRemarks) {
        throw new ApiError(
          400,
          "Incoming record can only be edited while status is expected"
        );
      }
    }

    const update = {
      updatedBy: userId,
    };

    const directFields = [
      "referenceNumber",
      "supplierName",
      "productName",
      "quantity",
      "unit",
      "remarks",
    ];

    for (const key of directFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          payload,
          key
        )
      ) {
        update[key] = payload[key];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "referenceType"
      )
    ) {
      update.referenceType =
        payload.referenceType;

      if (
        payload.referenceType !== "other"
      ) {
        update.referenceTypeOther = "";
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "referenceTypeOther"
      )
    ) {
      update.referenceTypeOther =
        payload.referenceTypeOther || "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "condition"
      )
    ) {
      update.condition = payload.condition;

      if (payload.condition !== "other") {
        update.conditionOther = "";
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "conditionOther"
      )
    ) {
      update.conditionOther =
        payload.conditionOther || "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "arrivalDate"
      )
    ) {
      update.arrivalDate = payload.arrivalDate
        ? new Date(payload.arrivalDate)
        : new Date();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "sku"
      )
    ) {
      update.sku = String(payload.sku || "")
        .trim()
        .toUpperCase();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "itemId"
      )
    ) {
      if (payload.itemId) {
        this.assertObjectId(
          payload.itemId,
          "Invalid item ID"
        );

        const item =
          await warehouseItemRepository.findById(
            {
              companyId,
              itemId: payload.itemId,
            }
          );

        if (!item) {
          throw new ApiError(
            404,
            "Warehouse item not found"
          );
        }

        if (
          String(item.warehouseId) !==
          String(current.warehouseId)
        ) {
          throw new ApiError(
            400,
            "Item does not belong to this warehouse"
          );
        }

        update.itemId = payload.itemId;
      } else {
        update.itemId = null;
      }
    }

    const record =
      await warehouseIncomingRepository
        .updateById({
          companyId,
          incomingId,
          payload: update,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Incoming record not found"
      );
    }

    return record;
  }

  async markReceived({
    companyId,
    incomingId,
    userId = null,
  }) {
    const current = await this.getIncoming({
      companyId,
      incomingId,
    });

    if (current.status !== "expected") {
      throw new ApiError(
        400,
        "Only expected incoming records can be marked as received"
      );
    }

    const record =
      await warehouseIncomingRepository
        .updateById({
          companyId,
          incomingId,
          payload: {
            status: "received",
            receivedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Incoming record not found"
      );
    }

    return record;
  }

  async confirm({
    companyId,
    incomingId,
    userId = null,
    employeeId = null,
  }) {
    const current = await this.getIncoming({
      companyId,
      incomingId,
    });

    if (current.status !== "received") {
      throw new ApiError(
        400,
        "Only received incoming records can be confirmed"
      );
    }

    if (current.itemId) {
      await warehouseItemService.adjustQuantity({
        companyId,
        itemId: current.itemId,
        userId,
        operation: "add",
        quantity: Number(
          current.quantity || 0
        ),
        reason:
          `Incoming confirmed: ${current.shipmentNumber}`,
      });
    }

    const record =
      await warehouseIncomingRepository
        .updateById({
          companyId,
          incomingId,
          payload: {
            status: "confirmed",
            confirmedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Incoming record not found"
      );
    }
    await warehouseActivityService.record({
      companyId,
      warehouseId: record.warehouseId,
      itemId: record.itemId,
      type: "goods_received",
      productName: record.productName,
      sku: record.sku,
      quantity: record.quantity,
      unit: record.unit,
      employeeId,
      userId,
      referenceType: "incoming",
      referenceId: record._id,
      referenceNumber: record.shipmentNumber,
      notes:
        `Supplier: ${record.supplierName || "-"}`,
      occurredAt: record.confirmedAt,
    });

    return record;
  }

  async cancel({
    companyId,
    incomingId,
    userId = null,
  }) {
    const current = await this.getIncoming({
      companyId,
      incomingId,
    });

    if (
      current.status !== "expected" &&
      current.status !== "received"
    ) {
      throw new ApiError(
        400,
        "Only expected or received incoming records can be cancelled"
      );
    }

    const record =
      await warehouseIncomingRepository
        .updateById({
          companyId,
          incomingId,
          payload: {
            status: "cancelled",
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Incoming record not found"
      );
    }

    return record;
  }

  async deleteIncoming({
    companyId,
    incomingId,
    userId = null,
  }) {
    const current = await this.getIncoming({
      companyId,
      incomingId,
    });

    if (current.status === "confirmed") {
      throw new ApiError(
        400,
        "Confirmed incoming records cannot be deleted"
      );
    }

    await warehouseIncomingRepository.softDelete({
      companyId,
      incomingId,
      userId,
    });

    return {
      incomingId: current._id,
      shipmentNumber: current.shipmentNumber,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseIncomingRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      expected: 0,
      received: 0,
      confirmed: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "expected":
          summary.expected = count;
          break;
        case "received":
          summary.received = count;
          break;
        case "confirmed":
          summary.confirmed = count;
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

export const warehouseIncomingService =
  new WarehouseIncomingService();

export default warehouseIncomingService;