import WarehouseTransfer
  from "../models/WarehouseTransfer.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyTransferDateRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.transferDate = {};

  if (fromDate) {
    filter.transferDate.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.transferDate.$lte = end;
  }
}

class WarehouseTransferRepository {
  async create(payload) {
    return WarehouseTransfer.create(payload);
  }

  async findById({
    companyId,
    transferId,
  }) {
    return WarehouseTransfer.findOne({
      _id: transferId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    fromWarehouseId = "",
    toWarehouseId = "",
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

    if (fromWarehouseId) {
      filter.fromWarehouseId =
        fromWarehouseId;
    }

    if (toWarehouseId) {
      filter.toWarehouseId = toWarehouseId;
    }

    if (status) {
      filter.status = status;
    }

    applyTransferDateRange(
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
      "transferDate",
      "productName",
      "status",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseTransfer.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseTransfer.countDocuments(filter),
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
    transferId,
    payload,
  }) {
    return WarehouseTransfer.findOneAndUpdate(
      {
        _id: transferId,
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
    transferId,
    userId,
  }) {
    return WarehouseTransfer.findOneAndUpdate(
      {
        _id: transferId,
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
    return WarehouseTransfer.aggregate([
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

export const warehouseTransferRepository =
  new WarehouseTransferRepository();

export default warehouseTransferRepository;