import mongoose from "mongoose";

import warehouseRepository
  from "../repositories/warehouse.repository.js";

import warehouseActivityService
  from "./warehouseActivity.service.js";

import { ApiError }
  from "../utils/apiError.js";

class WarehouseService {
  async createWarehouse({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const code = await this.generateCode({
      companyId,
    });

        const record =
      await warehouseRepository.create({
        companyId,

        code,

        name: payload.name,

      type: payload.type || "owned",

      typeOther:
        payload.type === "other"
          ? payload.typeOther || ""
          : "",

      addressLine1:
        payload.addressLine1 || "",
      addressLine2:
        payload.addressLine2 || "",
      city: payload.city || "",
      state: payload.state || "",
      country:
        payload.country || "India",
      pincode: payload.pincode || "",

      contactPerson:
        payload.contactPerson || "",
      phone: payload.phone || "",
      email: payload.email || "",

      capacity:
        Number(payload.capacity || 0),

      capacityUnit:
        payload.capacityUnit || "unit",

      capacityUnitOther:
        payload.capacityUnit === "other"
          ? payload.capacityUnitOther || ""
          : "",

      status:
        payload.status || "active",

      remarks:
        payload.remarks || "",

             createdBy: userId,

        createdByEmployeeId:
          employeeId,

        updatedBy: userId,
      });

    await warehouseActivityService.record({
      companyId,
      warehouseId: record._id,
      itemId: null,
      type: "warehouse_created",
      productName: "",
      sku: "",
      quantity: 0,
      unit: "unit",
      employeeId,
      userId,
      referenceType: "warehouse",
      referenceId: record._id,
      referenceNumber: record.code || "",
      notes: record.name || "",
      occurredAt: record.createdAt,
    });

    return record;
  }

  async listWarehouses({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseRepository.paginate({
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
      await warehouseRepository.findById({
        companyId,
        warehouseId,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Warehouse not found"
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

    if (update.type && update.type !== "other") {
      update.typeOther = "";
    }

    if (
      update.capacityUnit &&
      update.capacityUnit !== "other"
    ) {
      update.capacityUnitOther = "";
    }

    const record =
      await warehouseRepository.updateById({
        companyId,
        warehouseId,
        payload: update,
      });

    if (!record) {
      throw new ApiError(
        404,
        "Warehouse not found"
      );
    }

    return record;
  }

  async deleteWarehouse({
    companyId,
    warehouseId,
    userId = null,
  }) {
    const current = await this.getWarehouse({
      companyId,
      warehouseId,
    });

    await warehouseRepository.softDelete({
      companyId,
      warehouseId,
      userId,
    });

    return {
      warehouseId: current._id,
      code: current.code,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      active: 0,
      inactive: 0,
      maintenance: 0,
      totalCapacity: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      summary.totalCapacity +=
        Number(row.capacity || 0);

      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          row._id
        )
      ) {
        summary[row._id] = count;
      }
    }

    return summary;
  }

  async generateCode({ companyId }) {
    const now = new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}` +
      `${String(now.getMonth() + 1).padStart(2, "0")}` +
      `${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await warehouseRepository.latestCode({
        companyId,
        dateCode,
      });

    let next = 1;

    if (latest?.code) {
      const last = Number(
        latest.code.split("-").pop()
      );

      if (Number.isFinite(last)) {
        next = last + 1;
      }
    }

    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {
      const candidate =
        `WH-${dateCode}-${String(
          next + attempt
        ).padStart(4, "0")}`;

      const exists =
        await warehouseRepository.codeExists({
          companyId,
          code: candidate,
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

export const warehouseService =
  new WarehouseService();

export default warehouseService;