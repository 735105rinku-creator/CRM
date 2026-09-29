import WarehouseItem from "../models/WarehouseItem.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

class WarehouseItemRepository {
  async create(payload) {
    return WarehouseItem.create(payload);
  }

  async findById({
    companyId,
    itemId,
  }) {
    return WarehouseItem.findOne({
      _id: itemId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async findBySku({
    companyId,
    warehouseId,
    sku,
  }) {
    return WarehouseItem.findOne({
      companyId,
      warehouseId,
      sku,
      isActive: { $ne: false },
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    warehouseId = "",
    status = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: { $ne: false },
    };

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    if (status) {
      filter.status = status;
    }

    const q = String(search || "").trim();

    if (q) {
      const regex = new RegExp(
        escapeRegex(q),
        "i"
      );

      filter.$or = [
        { productName: regex },
        { sku: regex },
        { remarks: regex },
      ];
    }

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const allowedSort = new Set([
      "createdAt",
      "updatedAt",
      "productName",
      "sku",
      "availableQuantity",
      "status",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseItem.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseItem.countDocuments(filter),
    ]);

    const totalPages = Math.max(
      Math.ceil(total / safeLimit),
      1
    );

    return {
      data,

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,

        hasNextPage:
          safePage < totalPages,

        hasPreviousPage:
          safePage > 1,
      },
    };
  }

  async updateById({
    companyId,
    itemId,
    payload,
  }) {
    return WarehouseItem.findOneAndUpdate(
      {
        _id: itemId,
        companyId,
        isActive: { $ne: false },
      },
      {
        $set: payload,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async adjustQuantity({
    companyId,
    itemId,
    delta,
    field,
  }) {
    const inc = {};
    inc[field] = Number(delta || 0);

    return WarehouseItem.findOneAndUpdate(
      {
        _id: itemId,
        companyId,
        isActive: { $ne: false },
      },
      {
        $inc: inc,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async softDelete({
    companyId,
    itemId,
    userId,
  }) {
    return WarehouseItem.findOneAndUpdate(
      {
        _id: itemId,
        companyId,
        isActive: { $ne: false },
      },
      {
        $set: {
          isActive: false,
          updatedBy: userId,
        },
      },
      {
        new: true,
      }
    ).lean();
  }

  async summary(companyId) {
    return WarehouseItem.aggregate([
      {
        $match: {
          companyId,
          isActive: { $ne: false },
        },
      },

      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
  }
}

export const warehouseItemRepository =
  new WarehouseItemRepository();

export default warehouseItemRepository;