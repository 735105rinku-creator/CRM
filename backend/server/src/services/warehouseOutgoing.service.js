import mongoose from "mongoose";

import warehouseOutgoingRepository
  from "../repositories/warehouseOutgoing.repository.js";

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

class WarehouseOutgoingService {
  async createOutgoing({
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
      await warehouseOutgoingRepository
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
      await this.assertItemBelongsToWarehouse({
        companyId,
        itemId: payload.itemId,
        warehouseId: payload.warehouseId,
      });
    }

    if (
      payload.destinationType === "other_warehouse"
    ) {
      this.assertObjectId(
        payload.destinationWarehouseId,
        "Invalid destination warehouse ID"
      );

      if (
        String(payload.destinationWarehouseId) ===
        String(payload.warehouseId)
      ) {
        throw new ApiError(
          400,
          "Destination warehouse must be different from source warehouse"
        );
      }

      const dest =
        await warehouseRepository.findById({
          companyId,
          warehouseId:
            payload.destinationWarehouseId,
        });

      if (!dest) {
        throw new ApiError(
          404,
          "Destination warehouse not found"
        );
      }
    }

    return warehouseOutgoingRepository.create({
      companyId,

      warehouseId: payload.warehouseId,

      shipmentNumber,

      destinationType:
        payload.destinationType || "customer",

      destinationTypeOther:
        payload.destinationType === "other"
          ? payload.destinationTypeOther || ""
          : "",

      destinationWarehouseId:
        payload.destinationType === "other_warehouse"
          ? payload.destinationWarehouseId || null
          : null,

      customerName: payload.customerName,

      productName: payload.productName,

      sku: String(payload.sku || "")
        .trim()
        .toUpperCase(),

      itemId: payload.itemId || null,

      quantity: Number(payload.quantity || 0),

      unit: payload.unit || "unit",

      dispatchDate:
        payload.dispatchDate
          ? new Date(payload.dispatchDate)
          : new Date(),

      destination: payload.destination || "",

      remarks: payload.remarks || "",

      status: "preparing",

      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listOutgoing({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseOutgoingRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getOutgoing({
    companyId,
    outgoingId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      outgoingId,
      "Invalid outgoing ID"
    );

    const record =
      await warehouseOutgoingRepository
        .findById({
          companyId,
          outgoingId,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Outgoing record not found"
      );
    }

    return record;
  }

  async updateOutgoing({
    companyId,
    outgoingId,
    userId = null,
    payload,
  }) {
    const current = await this.getOutgoing({
      companyId,
      outgoingId,
    });

    if (current.status !== "preparing") {
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
          "Outgoing record can only be edited while status is preparing"
        );
      }
    }

    const update = {
      updatedBy: userId,
    };

    const directFields = [
      "customerName",
      "productName",
      "quantity",
      "unit",
      "destination",
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
        "destinationType"
      )
    ) {
      update.destinationType =
        payload.destinationType;

      if (
        payload.destinationType !== "other"
      ) {
        update.destinationTypeOther = "";
      }

      if (
        payload.destinationType !==
        "other_warehouse"
      ) {
        update.destinationWarehouseId = null;
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "destinationTypeOther"
      )
    ) {
      update.destinationTypeOther =
        payload.destinationTypeOther || "";
    }

    if (
      payload.destinationType ===
        "other_warehouse" &&
      Object.prototype.hasOwnProperty.call(
        payload,
        "destinationWarehouseId"
      )
    ) {
      this.assertObjectId(
        payload.destinationWarehouseId,
        "Invalid destination warehouse ID"
      );

      if (
        String(payload.destinationWarehouseId) ===
        String(current.warehouseId)
      ) {
        throw new ApiError(
          400,
          "Destination warehouse must be different from source warehouse"
        );
      }

      const dest =
        await warehouseRepository.findById({
          companyId,
          warehouseId:
            payload.destinationWarehouseId,
        });

      if (!dest) {
        throw new ApiError(
          404,
          "Destination warehouse not found"
        );
      }

      update.destinationWarehouseId =
        payload.destinationWarehouseId;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "dispatchDate"
      )
    ) {
      update.dispatchDate = payload.dispatchDate
        ? new Date(payload.dispatchDate)
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
        await this.assertItemBelongsToWarehouse({
          companyId,
          itemId: payload.itemId,
          warehouseId: current.warehouseId,
        });

        update.itemId = payload.itemId;
      } else {
        update.itemId = null;
      }
    }

    const record =
      await warehouseOutgoingRepository
        .updateById({
          companyId,
          outgoingId,
          payload: update,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Outgoing record not found"
      );
    }

    return record;
  }

  async dispatch({
    companyId,
    outgoingId,
    userId = null,
    employeeId = null,
  }) {
    const current = await this.getOutgoing({
      companyId,
      outgoingId,
    });

    if (current.status !== "preparing") {
      throw new ApiError(
        400,
        "Only preparing outgoing records can be dispatched"
      );
    }

    if (current.itemId) {
      await warehouseItemService.adjustQuantity({
        companyId,
        itemId: current.itemId,
        userId,
        operation: "remove",
        quantity: Number(
          current.quantity || 0
        ),
        reason:
          `Outgoing dispatched: ${current.shipmentNumber}`,
      });
    }

    const record =
      await warehouseOutgoingRepository
        .updateById({
          companyId,
          outgoingId,
          payload: {
            status: "dispatched",
            dispatchedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Outgoing record not found"
      );
    }
    await warehouseActivityService.record({
      companyId,
      warehouseId: record.warehouseId,
      itemId: record.itemId,
      type: "goods_dispatched",
      productName: record.productName,
      sku: record.sku,
      quantity: record.quantity,
      unit: record.unit,
      employeeId,
      userId,
      referenceType: "outgoing",
      referenceId: record._id,
      referenceNumber: record.shipmentNumber,
      notes:
        `Customer: ${record.customerName || "-"}`,
      occurredAt: record.dispatchedAt,
    });

    return record;
  }

  async markDelivered({
    companyId,
    outgoingId,
    userId = null,
  }) {
    const current = await this.getOutgoing({
      companyId,
      outgoingId,
    });

    if (current.status !== "dispatched") {
      throw new ApiError(
        400,
        "Only dispatched outgoing records can be marked delivered"
      );
    }

    const record =
      await warehouseOutgoingRepository
        .updateById({
          companyId,
          outgoingId,
          payload: {
            status: "delivered",
            deliveredAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Outgoing record not found"
      );
    }

    return record;
  }

  async cancel({
    companyId,
    outgoingId,
    userId = null,
  }) {
    const current = await this.getOutgoing({
      companyId,
      outgoingId,
    });

    if (current.status !== "preparing") {
      throw new ApiError(
        400,
        "Only preparing outgoing records can be cancelled"
      );
    }

    const record =
      await warehouseOutgoingRepository
        .updateById({
          companyId,
          outgoingId,
          payload: {
            status: "cancelled",
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Outgoing record not found"
      );
    }

    return record;
  }

  async deleteOutgoing({
    companyId,
    outgoingId,
    userId = null,
  }) {
    const current = await this.getOutgoing({
      companyId,
      outgoingId,
    });

    if (
      current.status === "dispatched" ||
      current.status === "delivered"
    ) {
      throw new ApiError(
        400,
        "Dispatched or delivered outgoing records cannot be deleted"
      );
    }

    await warehouseOutgoingRepository.softDelete({
      companyId,
      outgoingId,
      userId,
    });

    return {
      outgoingId: current._id,
      shipmentNumber: current.shipmentNumber,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseOutgoingRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      preparing: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "preparing":
          summary.preparing = count;
          break;
        case "dispatched":
          summary.dispatched = count;
          break;
        case "delivered":
          summary.delivered = count;
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

  async assertItemBelongsToWarehouse({
    companyId,
    itemId,
    warehouseId,
  }) {
    this.assertObjectId(itemId, "Invalid item ID");

    const item =
      await warehouseItemRepository.findById({
        companyId,
        itemId,
      });

    if (!item) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    if (
      String(item.warehouseId) !==
      String(warehouseId)
    ) {
      throw new ApiError(
        400,
        "Item does not belong to the selected warehouse"
      );
    }
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

export const warehouseOutgoingService =
  new WarehouseOutgoingService();

export default warehouseOutgoingService;