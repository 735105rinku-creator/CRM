import mongoose from "mongoose";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import logisticsWarehouseRepository
  from "../repositories/logisticsWarehouse.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class LogisticsWarehouseService {
  async createWarehouse({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const warehouseCode =
      await this.generateWarehouseCode({
        companyId,
      });

    return logisticsWarehouseRepository.create({
      companyId,
      warehouseCode,

      warehouseName:
        payload.warehouseName,

      address:
        payload.address || {},

      contact:
        payload.contact || {},

      storage:
        payload.storage || {},

      rates:
        payload.rates || {},

      gstNumber:
        payload.gstNumber || "",

      licenseNumber:
        payload.licenseNumber || "",

      status:
        payload.status || "active",

      statusOther:
        payload.status === "other"
          ? payload.statusOther || ""
          : "",

      remarks:
        payload.remarks,

      createdBy:
        userId,

      createdByEmployeeId:
        employeeId,

      updatedBy:
        userId,
    });
  }

  async listWarehouses({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return logisticsWarehouseRepository.paginate({
      companyId,
      ...query,
    });
  }

  async getWarehouse({
    companyId,
    warehouseId,
  }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(
      warehouseId,
      "Invalid warehouse ID"
    );

    const record =
      await logisticsWarehouseRepository.findById({
        companyId,
        warehouseId,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Logistics warehouse not found"
      );
    }

    return record;
  }

  async updateWarehouse({
    companyId,
    warehouseId,
    userId = null,
    payload,
  }) {
    await this.getWarehouse({
      companyId,
      warehouseId,
    });

    const update = {
      ...payload,
      updatedBy: userId,
    };

    if (
      update.status &&
      update.status !== "other"
    ) {
      update.statusOther = "";
    }

    const record =
      await logisticsWarehouseRepository.updateById({
        companyId,
        warehouseId,
        payload: update,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Logistics warehouse not found"
      );
    }

    return record;
  }

  async addReceipt({
    companyId,
    warehouseId,
    userId = null,
    payload,
  }) {
    const warehouse =
      await this.getWarehouse({
        companyId,
        warehouseId,
      });

    const shipmentNumber =
      String(payload.shipmentNo || "")
        .trim()
        .toUpperCase();

    const shipmentFilter =
      payload.shipmentId &&
      mongoose.isValidObjectId(payload.shipmentId)
        ? {
            _id: payload.shipmentId,
            companyId,
            isActive: true,
          }
        : {
            companyId,
            shipmentNumber,
            isActive: true,
          };

    const shipment =
      await LogisticsShipment.findOne(shipmentFilter)
        .select(
          "_id shipmentNumber customerName cargo status"
        )
        .lean();

    if (!shipment) {
      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }

    const receiptNumber =
      await this.generateReceiptNumber({
        companyId,
      });

    const receivedWeight =
      Number(payload.receivedWeight || 0);

    const occupiedIncrease =
      this.capacityIncreaseForReceipt({
        warehouse,
        payload,
      });

    const totalCapacity =
      Number(
        warehouse.storage?.totalCapacity || 0
      );

    const occupiedCapacity =
      Number(
        warehouse.storage?.occupiedCapacity || 0
      );

    if (
      totalCapacity > 0 &&
      occupiedCapacity + occupiedIncrease >
        totalCapacity
    ) {
      throw new ApiError(
        400,
        "Warehouse capacity is insufficient for this receipt"
      );
    }

    const receipt = {
      receiptNumber,

      shipmentId:
        shipment._id,

      shipmentNumber:
        shipment.shipmentNumber,

      customerName:
        shipment.customerName,

      commodity:
        payload.commodity ||
        shipment.cargo?.commodity ||
        "",

      receivedDate:
        dateOrNull(payload.receivedDate) ||
        new Date(),

      inwardReference:
        payload.inwardReference || "",

      movementType:
        payload.movementType || "inbound",

      storageType:
        payload.storageType || "general",

      zone:
        payload.zone || "",

      rackLocation:
        payload.rackLocation || "",

      binLocation:
        payload.binLocation || "",

      quality: {
        expectedQuantity:
          Number(payload.expectedQuantity || 0),

        receivedQuantity:
          Number(payload.receivedQuantity || 0),

        acceptedQuantity:
          Number(payload.acceptedQuantity || 0),

        rejectedQuantity:
          Number(payload.rejectedQuantity || 0),

        damagedQuantity:
          Number(payload.damagedQuantity || 0),

        quantityUnit:
          payload.quantityUnit || "",

        expectedWeight:
          Number(payload.expectedWeight || 0),

        receivedWeight,

        weightUnit:
          payload.weightUnit || "kg",

        weightUnitOther:
          payload.weightUnit === "other"
            ? payload.weightUnitOther || ""
            : "",

        temperature:
          nullableNumber(payload.temperature),

        humidity:
          nullableNumber(payload.humidity),

        batchNumber:
          payload.batchNumber || "",

        lotNumber:
          payload.lotNumber || "",

        qualityRemarks:
          payload.qualityRemarks || "",
      },

      status:
        payload.status || "received",

      statusOther:
        payload.status === "other"
          ? payload.statusOther || ""
          : "",

      remarks:
        payload.remarks,

      createdBy:
        userId,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    const updated =
      await logisticsWarehouseRepository.addReceipt({
        companyId,
        warehouseId,
        receipt,
        occupiedIncrease,
        userId,
      });

    await LogisticsShipment.updateOne(
      {
        _id:
          shipment._id,
        companyId,
        isActive: true,
      },
      {
        $set: {
          status:
            "at_warehouse",

          currentLocation:
            warehouse.warehouseName,

          updatedBy:
            userId,
        },

        $push: {
          statusHistory: {
            status:
              "at_warehouse",

            location:
              warehouse.warehouseName,

            remarks:
              `Warehouse receipt ${receiptNumber} created. ${payload.remarks}`,

            changedBy:
              userId,

            changedAt:
              new Date(),
          },
        },
      }
    );

    return updated;
  }

  async updateReceipt({
    companyId,
    warehouseId,
    receiptId,
    userId = null,
    payload,
  }) {
    const warehouse =
      await this.getWarehouse({
        companyId,
        warehouseId,
      });

    this.assertObjectId(
      receiptId,
      "Invalid warehouse receipt ID"
    );

    const existing =
      warehouse.receipts?.find(
        (item) =>
          String(item._id) ===
          String(receiptId)
      );

    if (!existing) {
      throw new ApiError(
        404,
        "Warehouse receipt not found"
      );
    }

    const update = {};

    const directFields = [
      "commodity",
      "inwardReference",
      "outwardReference",
      "movementType",
      "storageType",
      "zone",
      "rackLocation",
      "binLocation",
      "status",
      "statusOther",
      "remarks",
    ];

    for (const key of directFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          payload,
          key
        )
      ) {
        update[key] =
          payload[key];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "receivedDate"
      )
    ) {
      update.receivedDate =
        dateOrNull(payload.receivedDate);
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "releasedDate"
      )
    ) {
      update.releasedDate =
        dateOrNull(payload.releasedDate);
    }

    const quality = {
      ...(existing.quality || {}),
    };

    const qualityMap = [
      "expectedQuantity",
      "receivedQuantity",
      "acceptedQuantity",
      "rejectedQuantity",
      "damagedQuantity",
      "quantityUnit",
      "expectedWeight",
      "receivedWeight",
      "weightUnit",
      "weightUnitOther",
      "temperature",
      "humidity",
      "batchNumber",
      "lotNumber",
      "qualityRemarks",
    ];

    let qualityChanged =
      false;

    for (const key of qualityMap) {
      if (
        Object.prototype.hasOwnProperty.call(
          payload,
          key
        )
      ) {
        quality[key] =
          payload[key];

        qualityChanged =
          true;
      }
    }

    if (qualityChanged) {
      update.quality =
        quality;
    }

    let occupiedDelta =
      0;

    const oldStatus =
      existing.status;

    const newStatus =
      update.status ||
      oldStatus;

    if (
      !["released", "rejected", "dispatched", "cancelled"].includes(oldStatus) &&
      ["released", "rejected", "dispatched", "cancelled"].includes(newStatus)
    ) {
      occupiedDelta =
        -this.capacityIncreaseForReceipt({
          warehouse,
          payload: {
            receivedWeight:
              existing.quality?.receivedWeight || 0,

            receivedQuantity:
              existing.quality?.receivedQuantity || 0,
          },
        });
    }

    if (
      newStatus !== "other"
    ) {
      update.statusOther = "";
    }

    const updated =
      await logisticsWarehouseRepository.updateReceipt({
        companyId,
        warehouseId,
        receiptId,
        payload: update,
        occupiedDelta,
        userId,
      });

    if (!updated) {
      throw new ApiError(
        404,
        "Warehouse receipt not found"
      );
    }

    if (
      newStatus === "released"
    ) {
      await LogisticsShipment.updateOne(
        {
          _id:
            existing.shipmentId,
          companyId,
          isActive: true,
        },
        {
          $set: {
            updatedBy:
              userId,
          },

          $push: {
            statusHistory: {
              status:
                "at_warehouse",

              location:
                warehouse.warehouseName,

              remarks:
                `Warehouse receipt ${existing.receiptNumber} released. ${payload.remarks || ""}`,

              changedBy:
                userId,

              changedAt:
                new Date(),
            },
          },
        }
      );
    }

    return updated;
  }

  async deleteWarehouse({
    companyId,
    warehouseId,
    userId = null,
  }) {
    const current =
      await this.getWarehouse({
        companyId,
        warehouseId,
      });

    const activeReceipts =
      (current.receipts || []).filter(
        (receipt) =>
          ![
            "released",
            "rejected",
          ].includes(receipt.status)
      );

    if (activeReceipts.length) {
      throw new ApiError(
        400,
        "Warehouse cannot be deleted while active receipts are present"
      );
    }

    await logisticsWarehouseRepository.softDelete({
      companyId,
      warehouseId,
      userId,
    });

    return {
      warehouseId:
        current._id,

      warehouseCode:
        current.warehouseCode,

      deleted:
        true,
    };
  }

  async getSummary({
    companyId,
  }) {
    this.assertCompanyId(companyId);

    const rows =
      await logisticsWarehouseRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      active: 0,
      inactive: 0,
      full: 0,
      maintenance: 0,
      other: 0,
      totalCapacity: 0,
      occupiedCapacity: 0,
      availableCapacity: 0,
    };

    for (const row of rows) {
      const count =
        Number(row.count || 0);

      summary.total += count;
      summary.totalCapacity +=
        Number(row.capacity || 0);
      summary.occupiedCapacity +=
        Number(row.occupied || 0);

      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          row._id
        )
      ) {
        summary[row._id] = count;
      }
    }

    summary.availableCapacity =
      Math.max(
        0,
        summary.totalCapacity -
        summary.occupiedCapacity
      );

    return summary;
  }

  capacityIncreaseForReceipt({
    warehouse,
    payload,
  }) {
    const capacityUnit =
      String(
        warehouse.storage
          ?.capacityUnit || ""
      )
        .trim()
        .toLowerCase();
  
    const receivedWeight =
      Number(
        payload.receivedWeight ||
        0
      );
  
    const weightUnit =
      String(
        payload.weightUnit ||
        "kg"
      )
        .trim()
        .toLowerCase();
  
    const receivedQuantity =
      Number(
        payload.receivedQuantity ||
        0
      );
  
  
    /* ==========================================================
       WEIGHT BASED WAREHOUSE
  
       Convert receipt weight into warehouse capacity unit.
    ========================================================== */
  
    if (
      capacityUnit === "mt" ||
      capacityUnit === "ton"
    ) {
  
      let weightInKg =
        receivedWeight;
  
      if (weightUnit === "mt") {
        weightInKg =
          receivedWeight * 1000;
      }
  
      if (weightUnit === "ton") {
        weightInKg =
          receivedWeight * 1000;
      }
  
      if (weightUnit === "lb") {
        weightInKg =
          receivedWeight * 0.453592;
      }
  
      /*
       * Warehouse capacity is stored in MT / Ton,
       * therefore convert KG → MT.
       */
      return weightInKg / 1000;
    }
  
  
    /* ==========================================================
       PALLET BASED WAREHOUSE
    ========================================================== */
  
    if (
      capacityUnit ===
      "pallet"
    ) {
  
      /*
       * Current Warehouse Receipt does not yet send a separate
       * palletCount to backend.
       *
       * Use received quantity only as the current fallback.
       */
      return receivedQuantity;
    }
  
  
    /* ==========================================================
       AREA BASED WAREHOUSE
  
       sq_ft / sq_m cannot correctly be calculated from package
       count or shipment weight.
  
       Until actual occupied area is captured in Warehouse Receipt,
       do NOT increase capacity using package quantity.
    ========================================================== */
  
    if (
      capacityUnit === "sq_ft" ||
      capacityUnit === "sq_m"
    ) {
  
      return 0;
    }
  
  
    /* ==========================================================
       OTHER / UNKNOWN UNIT
  
       Never reject receipt using an incompatible unit.
    ========================================================== */
  
    return 0;
  }

  async generateWarehouseCode({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await logisticsWarehouseRepository.latestCode({
        companyId,
        dateCode,
      });

    let next = 1;

    if (latest?.warehouseCode) {
      const last =
        Number(
          latest.warehouseCode
            .split("-")
            .pop()
        );

      if (Number.isFinite(last)) {
        next =
          last + 1;
      }
    }

    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {
      const candidate =
        `WH-${dateCode}-${String(next + attempt).padStart(4, "0")}`;

      const exists =
        await logisticsWarehouseRepository.codeExists({
          companyId,
          warehouseCode:
            candidate,
        });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate warehouse code"
    );
  }

  async generateReceiptNumber({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    for (
      let sequence = 1;
      sequence <= 9999;
      sequence += 1
    ) {
      const candidate =
        `WR-${dateCode}-${String(sequence).padStart(4, "0")}`;

      const exists =
        await logisticsWarehouseRepository.receiptNumberExists({
          companyId,
          receiptNumber:
            candidate,
        });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate warehouse receipt number"
    );
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

  assertObjectId(
    value,
    message
  ) {
    if (
      !mongoose.isValidObjectId(value)
    ) {
      throw new ApiError(
        400,
        message
      );
    }
  }
}

function dateOrNull(value) {
  if (!value) return null;

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function nullableNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export const logisticsWarehouseService =
  new LogisticsWarehouseService();

export default logisticsWarehouseService;
