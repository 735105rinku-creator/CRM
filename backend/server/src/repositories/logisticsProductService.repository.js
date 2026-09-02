import LogisticsProductService
  from "../models/LogisticsProductService.js";

class LogisticsProductServiceRepository {
  async create(payload) {
    return LogisticsProductService.create(payload);
  }

  async findById({
    companyId,
    itemId,
  }) {
    return LogisticsProductService
      .findOne({
        _id: itemId,
        companyId,
        isActive: true,
      })
      .populate(
        "vendorId",
        "vendorCode vendorName companyName"
      )
      .lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    itemType = "",
    category = "",
    status = "",
    vendorId = null,
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: true,
    };

    if (itemType) {
      filter.itemType = itemType;
    }

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (vendorId) {
      filter.vendorId = vendorId;
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
        { itemCode: regex },
        { name: regex },
        { category: regex },
        { description: regex },
        { sku: regex },
        { hsnSacCode: regex },
        { vendorName: regex },
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
        "itemCode",
        "name",
        "salePrice",
        "status",
      ]);

    const field =
      allowedSort.has(sortBy)
        ? sortBy
        : "createdAt";

    const direction =
      sortOrder === "asc"
        ? 1
        : -1;

    const [data, total] =
      await Promise.all([
        LogisticsProductService
          .find(filter)
          .populate(
            "vendorId",
            "vendorCode vendorName companyName"
          )
          .sort({
            [field]: direction,
          })
          .skip(
            (safePage - 1) *
            safeLimit
          )
          .limit(safeLimit)
          .lean(),

        LogisticsProductService
          .countDocuments(filter),
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
    itemId,
    payload,
  }) {
    return LogisticsProductService
      .findOneAndUpdate(
        {
          _id: itemId,
          companyId,
          isActive: true,
        },
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
        }
      )
      .populate(
        "vendorId",
        "vendorCode vendorName companyName"
      );
  }

  async softDelete({
    companyId,
    itemId,
    userId,
  }) {
    return LogisticsProductService
      .findOneAndUpdate(
        {
          _id: itemId,
          companyId,
          isActive: true,
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
      )
      .lean();
  }

  async summary(companyId) {
    return LogisticsProductService.aggregate([
      {
        $match: {
          companyId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$itemType",
          count: {
            $sum: 1,
          },
          totalSaleValue: {
            $sum: "$salePrice",
          },
        },
      },
    ]);
  }

  async latestCode({
    companyId,
    dateCode,
  }) {
    return LogisticsProductService
      .findOne({
        companyId,
        itemCode: {
          $regex:
            new RegExp(
              `^LPS-${dateCode}-`,
              "i"
            ),
        },
      })
      .sort({
        itemCode: -1,
      })
      .select(
        "itemCode"
      )
      .lean();
  }

  async codeExists({
    companyId,
    itemCode,
  }) {
    return LogisticsProductService
      .exists({
        companyId,
        itemCode,
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

export const
  logisticsProductServiceRepository =
    new LogisticsProductServiceRepository();

export default
  logisticsProductServiceRepository;
