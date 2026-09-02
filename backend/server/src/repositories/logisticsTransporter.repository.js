import LogisticsTransporter from "../models/LogisticsTransporter.js";

class LogisticsTransporterRepository {
  async create(payload) {
    return LogisticsTransporter.create(payload);
  }

  async findById({ companyId, transporterId }) {
    return LogisticsTransporter.findOne({
      _id: transporterId,
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
    serviceType = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = { companyId, isActive: true };

    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;
    applyCreatedAtRange(filter, fromDate, toDate);

    const q = String(search || "").trim();

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { transporterCode: regex },
        { transporterName: regex },
        { contactPerson: regex },
        { mobile: regex },
        { email: regex },
        { gstNumber: regex },
        { panNumber: regex },
        { city: regex },
        { state: regex },
        { defaultDriverName: regex },
        { defaultVehicleNumber: regex },
      ];
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const allowedSort = new Set([
      "createdAt",
      "updatedAt",
      "transporterCode",
      "transporterName",
      "status",
    ]);

    const field = allowedSort.has(sortBy) ? sortBy : "createdAt";
    const direction = sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      LogisticsTransporter.find(filter)
        .sort({ [field]: direction })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      LogisticsTransporter.countDocuments(filter),
    ]);

    const totalPages = Math.max(Math.ceil(total / safeLimit), 1);

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    };
  }

  async updateById({ companyId, transporterId, payload }) {
    return LogisticsTransporter.findOneAndUpdate(
      { _id: transporterId, companyId, isActive: true },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
  }

  async softDelete({ companyId, transporterId, userId }) {
    return LogisticsTransporter.findOneAndUpdate(
      { _id: transporterId, companyId, isActive: true },
      { $set: { isActive: false, updatedBy: userId } },
      { new: true }
    ).lean();
  }

  async summary(companyId) {
    return LogisticsTransporter.aggregate([
      { $match: { companyId, isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
  }

  async latestCode({ companyId, dateCode }) {
    return LogisticsTransporter.findOne({
      companyId,
      transporterCode: { $regex: new RegExp(`^TRN-${dateCode}-`, "i") },
    })
      .sort({ transporterCode: -1 })
      .select("transporterCode")
      .lean();
  }

  async codeExists({ companyId, transporterCode }) {
    return LogisticsTransporter.exists({ companyId, transporterCode });
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

export const logisticsTransporterRepository =
  new LogisticsTransporterRepository();

export default logisticsTransporterRepository;
