import WarehouseDamage
  from "../models/WarehouseDamage.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyDamageDateRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.damageDate = {};

  if (fromDate) {
    filter.damageDate.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.damageDate.$lte = end;
  }
}

class WarehouseDamageRepository {
  async create(payload) {
    return WarehouseDamage.create(payload);
  }

  async findById({
    companyId,
    damageId,
  }) {
    return WarehouseDamage.findOne({
      _id: damageId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    warehouseId = "",
    itemId = "",
    status = "",
    fromDate = null,
    toDate = null,
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

    if (itemId) {
      filter.itemId = itemId;
    }

    if (status) {
      filter.status = status;
    }

    applyDamageDateRange(
      filter,
      fromDate,
      toDate
    );

    const q = String(search || "").trim();

    if (q) {
      const regex = new RegExp(
        escapeRegex(q),
        "i"
      );

      filter.$or = [
        { productName: regex },
        { sku: regex },
        { damageReason: regex },
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
      "damageDate",
      "productName",
      "status",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseDamage.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseDamage.countDocuments(filter),
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
    damageId,
    payload,
  }) {
    return WarehouseDamage.findOneAndUpdate(
      {
        _id: damageId,
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

  async softDelete({
    companyId,
    damageId,
    userId,
  }) {
    return WarehouseDamage.findOneAndUpdate(
      {
        _id: damageId,
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
    return WarehouseDamage.aggregate([
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

export const warehouseDamageRepository =
  new WarehouseDamageRepository();

export default warehouseDamageRepository;