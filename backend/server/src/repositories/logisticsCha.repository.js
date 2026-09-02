import LogisticsCha from "../models/LogisticsCha.js";

class LogisticsChaRepository {
  async create(payload) {
    return LogisticsCha.create(payload);
  }

  async findById({ companyId, chaId }) {
    return LogisticsCha.findOne({
      _id: chaId,
      companyId,
      isActive: true,
    }).lean();
  }

  async findByCaseNumber({ companyId, caseNumber }) {
    return LogisticsCha.findOne({
      companyId,
      caseNumber: String(caseNumber || "").trim().toUpperCase(),
      isActive: true,
    }).lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    shipmentNo = "",
    shipmentType = "",
    status = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: true,
    };

    if (shipmentNo) {
      filter.shipmentNumber =
        String(shipmentNo).trim().toUpperCase();
    }

    if (shipmentType) {
      filter.shipmentMode =
        normalizeShipmentMode(shipmentType);
    }

    if (status) {
      filter.status =
        normalizeStatus(status);
    }

    applyCreatedAtRange(filter, fromDate, toDate);

    const q = String(search || "").trim();

    if (q) {
      const regex =
        new RegExp(escapeRegex(q), "i");

      filter.$or = [
        { caseNumber: regex },
        { shipmentNumber: regex },
        { customerName: regex },
        { chaAgent: regex },
        { chaAgentOther: regex },
        { customsLocation: regex },
        { customsLocationOther: regex },
        { shippingBillNumber: regex },
        { billOfEntryNumber: regex },
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
        "caseNumber",
        "assignedDate",
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
        LogisticsCha.find(filter)
          .sort({ [field]: direction })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit)
          .lean(),

        LogisticsCha.countDocuments(filter),
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
    chaId,
    payload,
  }) {
    return LogisticsCha.findOneAndUpdate(
      {
        _id: chaId,
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

  async pushStatus({
    companyId,
    chaId,
    status,
    statusOther,
    remarks,
    userId,
  }) {
    return LogisticsCha.findOneAndUpdate(
      {
        _id: chaId,
        companyId,
        isActive: true,
      },
      {
        $set: {
          status,
          statusOther:
            status === "other"
              ? statusOther || ""
              : "",
          remarks,
          updatedBy: userId,
        },
        $push: {
          statusHistory: {
            status,
            statusOther:
              status === "other"
                ? statusOther || ""
                : "",
            remarks,
            changedBy: userId,
            changedAt: new Date(),
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
  }

  async softDelete({
    companyId,
    chaId,
    userId,
  }) {
    return LogisticsCha.findOneAndUpdate(
      {
        _id: chaId,
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
    return LogisticsCha.aggregate([
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
        },
      },
    ]);
  }

  async latestCaseNumber({
    companyId,
    dateCode,
  }) {
    return LogisticsCha.findOne({
      companyId,
      caseNumber: {
        $regex:
          new RegExp(
            `^CHA-${dateCode}-`,
            "i"
          ),
      },
    })
      .sort({ caseNumber: -1 })
      .select("caseNumber")
      .lean();
  }

  async caseNumberExists({
    companyId,
    caseNumber,
  }) {
    return LogisticsCha.exists({
      companyId,
      caseNumber,
    });
  }
}

function normalizeShipmentMode(value) {
  switch (value) {
    case "air-cargo":
      return "air_cargo";
    case "sea-freight":
      return "sea_freight";
    default:
      return value;
  }
}

function normalizeStatus(value) {
  switch (value) {
    case "documents-pending":
      return "documents_pending";
    case "duty-pending":
      return "duty_pending";
    default:
      return value;
  }
}

function escapeRegex(value) {
  return String(value)
    .replace(
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

export const logisticsChaRepository =
  new LogisticsChaRepository();

export default logisticsChaRepository;
