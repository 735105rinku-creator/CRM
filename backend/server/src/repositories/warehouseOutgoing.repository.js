import WarehouseOutgoing
  from "../models/WarehouseOutgoing.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyDispatchDateRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.dispatchDate = {};

  if (fromDate) {
    filter.dispatchDate.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.dispatchDate.$lte = end;
  }
}

class WarehouseOutgoingRepository {
  async create(payload) {
    return WarehouseOutgoing.create(payload);
  }

  async findById({
    companyId,
    outgoingId,
  }) {
    return WarehouseOutgoing.findOne({
      _id: outgoingId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async findByShipmentNumber({
    companyId,
    shipmentNumber,
  }) {
    return WarehouseOutgoing.findOne({
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

    applyDispatchDateRange(
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
        { customerName: regex },
        { productName: regex },
        { sku: regex },
        { destination: regex },
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
      "dispatchDate",
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
      WarehouseOutgoing.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      WarehouseOutgoing.countDocuments(filter),
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
    outgoingId,
    payload,
  }) {
    return WarehouseOutgoing.findOneAndUpdate(
      {
        _id: outgoingId,
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
    outgoingId,
    userId,
  }) {
    return WarehouseOutgoing.findOneAndUpdate(
      {
        _id: outgoingId,
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
    return WarehouseOutgoing.aggregate([
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

export const warehouseOutgoingRepository =
  new WarehouseOutgoingRepository();

export default warehouseOutgoingRepository;