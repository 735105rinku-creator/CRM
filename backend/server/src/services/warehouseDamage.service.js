import mongoose from "mongoose";

import warehouseDamageRepository
  from "../repositories/warehouseDamage.repository.js";

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

class WarehouseDamageService {
  async createDamage({
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

    this.assertObjectId(
      payload.itemId,
      "Invalid item ID"
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

    const item =
      await warehouseItemRepository.findById({
        companyId,
        itemId: payload.itemId,
      });

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
      item.availableQuantity || 0
    );

    if (quantity > available) {
      throw new ApiError(
        400,
        "Quantity exceeds available stock in warehouse"
      );
    }

    await this.applyDamageToItem({
      companyId,
      itemId: item._id,
      quantity,
      userId,
    });
    const record =
      await warehouseDamageRepository.create({
        companyId,

        warehouseId: payload.warehouseId,

        itemId: item._id,

        productName: item.productName,

        sku: item.sku,

        quantity,

        unit: item.unit || "unit",

        damageReason: payload.damageReason,

        damageDate:
          payload.damageDate
            ? new Date(payload.damageDate)
            : new Date(),

        remarks: payload.remarks || "",

        status: "reported",

        createdBy: userId,
        createdByEmployeeId: employeeId,
        updatedBy: userId,
      });

    await warehouseActivityService.record({
      companyId,
      warehouseId: record.warehouseId,
      itemId: record.itemId,
      type: "damaged_goods_reported",
      productName: record.productName,
      sku: record.sku,
      quantity: record.quantity,
      unit: record.unit,
      employeeId,
      userId,
      referenceType: "damage",
      referenceId: record._id,
      referenceNumber: "",
      notes: record.damageReason || "",
      occurredAt: record.damageDate,
    });

    return record;
  }

  async listDamages({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return warehouseDamageRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getDamage({
    companyId,
    damageId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      damageId,
      "Invalid damage ID"
    );

    const record =
      await warehouseDamageRepository
        .findById({
          companyId,
          damageId,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Damage record not found"
      );
    }

    return record;
  }

  async markUnderReview({
    companyId,
    damageId,
    userId = null,
  }) {
    const current = await this.getDamage({
      companyId,
      damageId,
    });

    if (current.status !== "reported") {
      throw new ApiError(
        400,
        "Only reported damage records can be marked under review"
      );
    }

    const record =
      await warehouseDamageRepository
        .updateById({
          companyId,
          damageId,
          payload: {
            status: "under_review",
            reviewedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Damage record not found"
      );
    }

    return record;
  }

  async approve({
    companyId,
    damageId,
    userId = null,
  }) {
    const current = await this.getDamage({
      companyId,
      damageId,
    });

    if (current.status !== "under_review") {
      throw new ApiError(
        400,
        "Only damage records under review can be approved"
      );
    }

    const record =
      await warehouseDamageRepository
        .updateById({
          companyId,
          damageId,
          payload: {
            status: "approved",
            approvedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Damage record not found"
      );
    }

    return record;
  }

  async markRemoved({
    companyId,
    damageId,
    userId = null,
  }) {
    const current = await this.getDamage({
      companyId,
      damageId,
    });

    if (current.status !== "approved") {
      throw new ApiError(
        400,
        "Only approved damage records can be removed from stock"
      );
    }

    await this.removeDamageFromItem({
      companyId,
      itemId: current.itemId,
      quantity: Number(
        current.quantity || 0
      ),
      userId,
    });

    const record =
      await warehouseDamageRepository
        .updateById({
          companyId,
          damageId,
          payload: {
            status: "removed",
            removedAt: new Date(),
            updatedBy: userId,
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Damage record not found"
      );
    }

    return record;
  }

  async deleteDamage({
    companyId,
    damageId,
    userId = null,
  }) {
    const current = await this.getDamage({
      companyId,
      damageId,
    });

    if (current.status !== "reported") {
      throw new ApiError(
        400,
        "Only reported damage records can be deleted"
      );
    }

    await this.reverseDamageFromItem({
      companyId,
      itemId: current.itemId,
      quantity: Number(
        current.quantity || 0
      ),
      userId,
    });

    await warehouseDamageRepository.softDelete({
      companyId,
      damageId,
      userId,
    });

    return {
      damageId: current._id,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows =
      await warehouseDamageRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      reported: 0,
      underReview: 0,
      approved: 0,
      removed: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);

      summary.total += count;

      switch (row._id) {
        case "reported":
          summary.reported = count;
          break;
        case "under_review":
          summary.underReview = count;
          break;
        case "approved":
          summary.approved = count;
          break;
        case "removed":
          summary.removed = count;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  async applyDamageToItem({
    companyId,
    itemId,
    quantity,
    userId,
  }) {
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

    const available = Number(
      item.availableQuantity || 0
    );

    if (quantity > available) {
      throw new ApiError(
        400,
        "Quantity exceeds available stock"
      );
    }

    const afterAvailable =
      await warehouseItemRepository.adjustQuantity(
        {
          companyId,
          itemId,
          field: "availableQuantity",
          delta: -quantity,
        }
      );

    if (!afterAvailable) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    let afterDamaged;
    try {
      afterDamaged =
        await warehouseItemRepository.adjustQuantity(
          {
            companyId,
            itemId,
            field: "damagedQuantity",
            delta: quantity,
          }
        );
    } catch (error) {
      try {
        await warehouseItemRepository.adjustQuantity(
          {
            companyId,
            itemId,
            field: "availableQuantity",
            delta: quantity,
          }
        );
      } catch (rollbackError) {
        console.error(
          "[warehouseDamage.applyDamageToItem] rollback failed",
          {
            itemId: String(itemId),
            rollbackError,
          }
        );
      }

      throw error;
    }

    if (!afterDamaged) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    await this.refreshItemStatus({
      companyId,
      itemId,
      item: afterDamaged,
      userId,
    });
  }

  async removeDamageFromItem({
    companyId,
    itemId,
    quantity,
    userId,
  }) {
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

    const damaged = Number(
      item.damagedQuantity || 0
    );

    if (quantity > damaged) {
      throw new ApiError(
        400,
        "Quantity exceeds damaged stock"
      );
    }

    const after =
      await warehouseItemRepository.adjustQuantity(
        {
          companyId,
          itemId,
          field: "damagedQuantity",
          delta: -quantity,
        }
      );

    if (!after) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    await this.refreshItemStatus({
      companyId,
      itemId,
      item: after,
      userId,
    });
  }

  async reverseDamageFromItem({
    companyId,
    itemId,
    quantity,
    userId,
  }) {
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

    const damaged = Number(
      item.damagedQuantity || 0
    );

    if (quantity > damaged) {
      throw new ApiError(
        400,
        "Quantity exceeds damaged stock"
      );
    }

    const afterDamaged =
      await warehouseItemRepository.adjustQuantity(
        {
          companyId,
          itemId,
          field: "damagedQuantity",
          delta: -quantity,
        }
      );

    if (!afterDamaged) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    let afterAvailable;
    try {
      afterAvailable =
        await warehouseItemRepository.adjustQuantity(
          {
            companyId,
            itemId,
            field: "availableQuantity",
            delta: quantity,
          }
        );
    } catch (error) {
      try {
        await warehouseItemRepository.adjustQuantity(
          {
            companyId,
            itemId,
            field: "damagedQuantity",
            delta: quantity,
          }
        );
      } catch (rollbackError) {
        console.error(
          "[warehouseDamage.reverseDamageFromItem] rollback failed",
          {
            itemId: String(itemId),
            rollbackError,
          }
        );
      }

      throw error;
    }

    if (!afterAvailable) {
      throw new ApiError(
        404,
        "Warehouse item not found"
      );
    }

    await this.refreshItemStatus({
      companyId,
      itemId,
      item: afterAvailable,
      userId,
    });
  }

  async refreshItemStatus({
    companyId,
    itemId,
    item,
    userId,
  }) {
    const nextStatus =
      warehouseItemService.deriveStatus({
        availableQuantity:
          item.availableQuantity || 0,
        reservedQuantity:
          item.reservedQuantity || 0,
        damagedQuantity:
          item.damagedQuantity || 0,
        reorderLevel:
          item.reorderLevel || 0,
      });

    if (nextStatus !== item.status) {
      await warehouseItemRepository.updateById(
        {
          companyId,
          itemId,
          payload: {
            status: nextStatus,
            updatedBy: userId,
          },
        }
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

export const warehouseDamageService =
  new WarehouseDamageService();

export default warehouseDamageService;