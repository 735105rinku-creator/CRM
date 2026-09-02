import LogisticsWarehouse from "../models/LogisticsWarehouse.js";

class LogisticsWarehouseRepository {
  async create(payload) {
    return LogisticsWarehouse.create(payload);
  }

  async findById({
    companyId,
    warehouseId,
  }) {
    return LogisticsWarehouse.findOne({
      _id: warehouseId,
      companyId,
      isActive: true,
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    status = "",
    storageType = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: true,
    };

    if (status) {
      filter.status = status;
    }

    if (storageType) {
      filter["storage.storageType"] = storageType;
    }

    applyCreatedAtRange(filter, fromDate, toDate);

    const q =
      String(search || "").trim();

    if (q) {
      const regex =
        new RegExp(
          escapeRegex(q),
          "i"
        );

      filter.$or = [
        { warehouseCode: regex },
        { warehouseName: regex },
        { "address.city": regex },
        { "address.state": regex },
        { "contact.contactPerson": regex },
        { "contact.mobile": regex },
        { gstNumber: regex },
        { licenseNumber: regex },
        { "receipts.shipmentNumber": regex },
        { "receipts.receiptNumber": regex },
      ];
    }

    const safePage =
      Math.max(Number(page) || 1, 1);

    const safeLimit =
      Math.min(
        Math.max(Number(limit) || 20, 1),
        100
      );

    const allowedSort =
      new Set([
        "createdAt",
        "updatedAt",
        "warehouseCode",
        "warehouseName",
        "status",
      ]);

    const field =
      allowedSort.has(sortBy)
        ? sortBy
        : "createdAt";

    const direction =
      sortOrder === "asc" ? 1 : -1;

    const [data, total] =
      await Promise.all([
        LogisticsWarehouse.find(filter)
          .sort({ [field]: direction })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit)
          .lean(),

        LogisticsWarehouse.countDocuments(filter),
      ]);

    const totalPages =
      Math.max(
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
    return LogisticsWarehouse.findOneAndUpdate(
      {
        _id: warehouseId,
        companyId,
        isActive: true,
      },
      { $set: payload },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async addReceipt({
    companyId,
    warehouseId,
    receipt,
    occupiedIncrease,
    userId,
  }) {
    return LogisticsWarehouse.findOneAndUpdate(
      {
        _id: warehouseId,
        companyId,
        isActive: true,
      },
      {
        $push: {
          receipts: receipt,
        },
        $inc: {
          "storage.occupiedCapacity":
            Number(occupiedIncrease || 0),
        },
        $set: {
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async updateReceipt({
    companyId,
    warehouseId,
    receiptId,
    payload,
    occupiedDelta = 0,
    userId,
  }) {
    const setData = {
      updatedBy: userId,
      "receipts.$.updatedAt": new Date(),
    };

    for (const [key, value] of Object.entries(payload)) {
      setData[`receipts.$.${key}`] = value;
    }

    const update = {
      $set: setData,
    };

    if (occupiedDelta) {
      update.$inc = {
        "storage.occupiedCapacity":
          occupiedDelta,
      };
    }

    return LogisticsWarehouse.findOneAndUpdate(
      {
        _id: warehouseId,
        companyId,
        isActive: true,
        "receipts._id": receiptId,
      },
      update,
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
    return LogisticsWarehouse.findOneAndUpdate(
      {
        _id: warehouseId,
        companyId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          updatedBy: userId,
        },
      },
      { new: true }
    ).lean();
  }

  async summary(companyId) {
    return LogisticsWarehouse.aggregate([
      {
        $match: {
          companyId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          capacity: {
            $sum: "$storage.totalCapacity",
          },
          occupied: {
            $sum: "$storage.occupiedCapacity",
          },
        },
      },
    ]);
  }

  async latestCode({
    companyId,
    dateCode,
  }) {
    return LogisticsWarehouse.findOne({
      companyId,
      warehouseCode: {
        $regex:
          new RegExp(
            `^WH-${dateCode}-`,
            "i"
          ),
      },
    })
      .sort({ warehouseCode: -1 })
      .select("warehouseCode")
      .lean();
  }

  async codeExists({
    companyId,
    warehouseCode,
  }) {
    return LogisticsWarehouse.exists({
      companyId,
      warehouseCode,
    });
  }

  async receiptNumberExists({
    companyId,
    receiptNumber,
  }) {
    return LogisticsWarehouse.exists({
      companyId,
      "receipts.receiptNumber":
        receiptNumber,
    });
  }
}

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function applyCreatedAtRange(filter, fromDate, toDate) {
  if (!fromDate && !toDate) return;
  filter.createdAt = {};
  if (fromDate) filter.createdAt.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt.$lte = end;
  }
}

export const logisticsWarehouseRepository =
  new LogisticsWarehouseRepository();

export default logisticsWarehouseRepository;
