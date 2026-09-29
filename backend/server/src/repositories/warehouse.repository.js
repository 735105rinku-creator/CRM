import Warehouse from "../models/Warehouse.js";

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyCreatedAtRange(
  filter,
  fromDate,
  toDate
) {
  if (!fromDate && !toDate) {
    return;
  }

  filter.createdAt = {};

  if (fromDate) {
    filter.createdAt.$gte =
      new Date(fromDate);
  }

  if (toDate) {
    const end = new Date(toDate);

    end.setHours(23, 59, 59, 999);

    filter.createdAt.$lte = end;
  }
}

class WarehouseRepository {
  async create(payload) {
    return Warehouse.create(payload);
  }

  async findById({
    companyId,
    warehouseId,
  }) {
    return Warehouse.findOne({
      _id: warehouseId,
      companyId,
      isActive: { $ne: false },
    }).lean();
  }

  async findByCode({
    companyId,
    code,
  }) {
    return Warehouse.findOne({
      companyId,
      code,
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    status = "",
    type = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: { $ne: false },
    };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    applyCreatedAtRange(
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
        { code: regex },
        { name: regex },
        { city: regex },
        { state: regex },
        { country: regex },
        { contactPerson: regex },
        { phone: regex },
        { email: regex },
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
      "code",
      "name",
      "status",
      "type",
    ]);

    const field = allowedSort.has(sortBy)
      ? sortBy
      : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      Warehouse.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),

      Warehouse.countDocuments(filter),
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
    warehouseId,
    payload,
  }) {
    return Warehouse.findOneAndUpdate(
      {
        _id: warehouseId,
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
    warehouseId,
    userId,
  }) {
    return Warehouse.findOneAndUpdate(
      {
        _id: warehouseId,
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

  async latestCode({
    companyId,
    dateCode,
  }) {
    return Warehouse.findOne({
      companyId,

      code: {
        $regex: new RegExp(
          `^WH-${dateCode}-`,
          "i"
        ),
      },
    })
      .sort({ code: -1 })
      .select("code")
      .lean();
  }

  async codeExists({
    companyId,
    code,
  }) {
    return Warehouse.exists({
      companyId,
      code,
    });
  }

  async summary(companyId) {
    return Warehouse.aggregate([
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
          capacity: {
            $sum: "$capacity",
          },
        },
      },
    ]);
  }
}

export const warehouseRepository =
  new WarehouseRepository();

export default warehouseRepository;