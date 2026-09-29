import WarehouseIncoming
  from "../models/WarehouseIncoming.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyArrivalDateRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.arrivalDate = {};

  if (fromDate) {
    filter.arrivalDate.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.arrivalDate.$lte = end;
  }
}

class WarehouseIncomingRepository {
  async create(payload) {
    return WarehouseIncoming.create(payload);
  }

  async findById({
    companyId,
    incomingId,
  }) {
    return WarehouseIncoming.findOne({
      _id: incomingId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async findByShipmentNumber({
    companyId,
    shipmentNumber,
  }) {
    return WarehouseIncoming.findOne({
      companyId,
      shipmentNumber,
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    warehouseId = "",
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

    if (status) {
      filter.status = status;
    }

    applyArrivalDateRange(
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
        { shipmentNumber: regex },
        { referenceNumber: regex },
        { supplierName: regex },
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
      "arrivalDate",
      "shipmentNumber",
      "productName",
      "status",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      WarehouseIncoming.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseIncoming.countDocuments(filter),
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
    incomingId,
    payload,
  }) {
    return WarehouseIncoming.findOneAndUpdate(
      {
        _id: incomingId,
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
    incomingId,
    userId,
  }) {
    return WarehouseIncoming.findOneAndUpdate(
      {
        _id: incomingId,
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
    return WarehouseIncoming.aggregate([
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

export const warehouseIncomingRepository =
  new WarehouseIncomingRepository();

export default warehouseIncomingRepository;