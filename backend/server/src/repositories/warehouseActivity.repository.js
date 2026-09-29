import WarehouseActivity
  from "../models/WarehouseActivity.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyOccurredAtRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.occurredAt = {};

  if (fromDate) {
    filter.occurredAt.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.occurredAt.$lte = end;
  }
}

class WarehouseActivityRepository {
  async create(payload) {
    return WarehouseActivity.create(payload);
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    warehouseId = "",
    itemId = "",
    type = "",
    employeeId = "",
    fromDate = null,
    toDate = null,
    sortBy = "occurredAt",
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

    if (type) {
      filter.type = type;
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    applyOccurredAtRange(
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
        { referenceNumber: regex },
        { notes: regex },
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
      "occurredAt",
      "createdAt",
      "quantity",
      "type",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "occurredAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseActivity.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseActivity.countDocuments(filter),
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

  async summary(companyId) {
    return WarehouseActivity.aggregate([
      {
        $match: {
          companyId,
          isActive: { $ne: false },
        },
      },

      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);
  }
}

export const warehouseActivityRepository =
  new WarehouseActivityRepository();

export default warehouseActivityRepository;