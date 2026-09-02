import mongoose from "mongoose";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import logisticsProductServiceRepository
  from "../repositories/logisticsProductService.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class LogisticsProductServiceService {
  async createItem({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const itemCode =
      await this.generateItemCode({
        companyId,
      });

    const vendor =
      await this.resolveVendor({
        companyId,
        vendorId:
          payload.vendorId,
      });

    return logisticsProductServiceRepository
      .create({
        companyId,
        itemCode,

        itemType:
          payload.itemType,

        itemTypeOther:
          payload.itemType === "other"
            ? payload.itemTypeOther || ""
            : "",

        name:
          payload.name,

        category:
          payload.category,

        categoryOther:
          payload.category === "other"
            ? payload.categoryOther || ""
            : "",

        description:
          payload.description || "",

        sku:
          payload.sku || "",

        hsnSacCode:
          payload.hsnSacCode || "",

        unit:
          payload.unit,

        unitOther:
          payload.unit === "other"
            ? payload.unitOther || ""
            : "",

        costPrice:
          Number(payload.costPrice || 0),

        salePrice:
          Number(payload.salePrice || 0),

        taxPercent:
          Number(payload.taxPercent || 0),

        currency:
          String(
            payload.currency || "INR"
          )
            .trim()
            .toUpperCase(),

        vendorId:
          vendor?._id || null,

        vendorName:
          vendor?.vendorName ||
          payload.vendorName ||
          "",

        serviceMode:
          normalizeMode(
            payload.serviceMode ||
            "not_applicable"
          ),

        serviceModeOther:
          payload.serviceMode === "other"
            ? payload.serviceModeOther || ""
            : "",

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

  async listItems({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return logisticsProductServiceRepository
      .paginate({
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
      "Invalid Product/Service ID"
    );

    const item =
      await logisticsProductServiceRepository
        .findById({
          companyId,
          itemId,
        });

    if (!item) {
      throw new ApiError(
        404,
        "Product/Service not found"
      );
    }

    return item;
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
      ...payload,
      updatedBy:
        userId,
    };

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "serviceMode"
        )
    ) {
      update.serviceMode =
        normalizeMode(
          update.serviceMode
        );

      if (
        update.serviceMode !== "other"
      ) {
        update.serviceModeOther = "";
      }
    }

    clearOther(
      update,
      "itemType",
      "itemTypeOther"
    );

    clearOther(
      update,
      "category",
      "categoryOther"
    );

    clearOther(
      update,
      "unit",
      "unitOther"
    );

    clearOther(
      update,
      "status",
      "statusOther"
    );

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "vendorId"
        )
    ) {
      const vendor =
        await this.resolveVendor({
          companyId,
          vendorId:
            update.vendorId,
        });

      update.vendorId =
        vendor?._id || null;

      update.vendorName =
        vendor?.vendorName || "";
    }

    const item =
      await logisticsProductServiceRepository
        .updateById({
          companyId,
          itemId,
          payload:
            update,
        });

    if (!item) {
      throw new ApiError(
        404,
        "Product/Service not found"
      );
    }

    return item;
  }

  async deleteItem({
    companyId,
    itemId,
    userId = null,
  }) {
    const current =
      await this.getItem({
        companyId,
        itemId,
      });

    await logisticsProductServiceRepository
      .softDelete({
        companyId,
        itemId,
        userId,
      });

    return {
      itemId:
        current._id,

      itemCode:
        current.itemCode,

      deleted:
        true,
    };
  }

  async getSummary({
    companyId,
  }) {
    this.assertCompanyId(companyId);

    const rows =
      await logisticsProductServiceRepository
        .summary(
          new mongoose.Types.ObjectId(
            String(companyId)
          )
        );

    const summary = {
      total:
        0,

      products:
        0,

      services:
        0,

      other:
        0,

      totalSaleValue:
        0,
    };

    for (const row of rows) {
      const count =
        Number(row.count || 0);

      summary.total +=
        count;

      summary.totalSaleValue +=
        Number(
          row.totalSaleValue || 0
        );

      if (
        row._id === "product"
      ) {
        summary.products =
          count;
      } else if (
        row._id === "service"
      ) {
        summary.services =
          count;
      } else {
        summary.other +=
          count;
      }
    }

    return summary;
  }

  async resolveVendor({
    companyId,
    vendorId,
  }) {
    if (!vendorId) {
      return null;
    }

    this.assertObjectId(
      vendorId,
      "Invalid vendor ID"
    );

    const vendor =
      await LogisticsVendor
        .findOne({
          _id:
            vendorId,

          companyId,

          isActive:
            true,
        })
        .select(
          "_id vendorName vendorCode"
        )
        .lean();

    if (!vendor) {
      throw new ApiError(
        404,
        "Logistics vendor not found"
      );
    }

    return vendor;
  }

  async generateItemCode({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await logisticsProductServiceRepository
        .latestCode({
          companyId,
          dateCode,
        });

    let next =
      1;

    if (
      latest?.itemCode
    ) {
      const last =
        Number(
          latest.itemCode
            .split("-")
            .pop()
        );

      if (
        Number.isFinite(last)
      ) {
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
        `LPS-${dateCode}-${String(next + attempt).padStart(4, "0")}`;

      const exists =
        await logisticsProductServiceRepository
          .codeExists({
            companyId,
            itemCode:
              candidate,
          });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate Product/Service code"
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

function normalizeMode(value) {
  const map = {
    "air-cargo":
      "air_cargo",

    "sea-freight":
      "sea_freight",

    "road-transport":
      "road_transport",

    "customs-cha":
      "customs_cha",

    "multi-mode":
      "multi_mode",

    "not-applicable":
      "not_applicable",
  };

  return map[value] || value;
}

function clearOther(
  object,
  field,
  otherField
) {
  if (
    Object.prototype
      .hasOwnProperty
      .call(
        object,
        field
      ) &&
    object[field] !== "other"
  ) {
    object[otherField] = "";
  }
}

export const
  logisticsProductServiceService =
    new LogisticsProductServiceService();

export default
  logisticsProductServiceService;
