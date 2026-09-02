import LogisticsVendor from "../models/LogisticsVendor.js";

class LogisticsVendorRepository {
  async create(payload) { return LogisticsVendor.create(payload); }

  async findById({ companyId, vendorId }) {
    return LogisticsVendor.findOne({ _id: vendorId, companyId, isActive: true }).lean();
  }

  async paginate({
    companyId, page = 1, limit = 20, search = "", vendorType = "",
    serviceCategory = "", status = "", fromDate = null, toDate = null, sortBy = "createdAt", sortOrder = "desc",
  }) {
    const filter = { companyId, isActive: true };
    if (vendorType) filter.vendorType = vendorType;
    if (serviceCategory) filter.serviceCategory = normalizeCategory(serviceCategory);
    if (status) filter.status = status;
    applyCreatedAtRange(filter, fromDate, toDate);

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { vendorCode: regex }, { vendorName: regex }, { companyName: regex },
        { contactPerson: regex }, { mobile: regex }, { email: regex },
        { gstNumber: regex }, { panNumber: regex }, { iecNumber: regex },
        { "address.city": regex }, { "address.state": regex }, { productsServices: regex },
      ];
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const allowed = new Set(["createdAt", "updatedAt", "vendorCode", "vendorName",
      "status", "openingPayable", "creditDays"]);
    const safeSortBy = allowed.has(sortBy) ? sortBy : "createdAt";
    const direction = sortOrder === "asc" ? 1 : -1;

    const [data, total] = await Promise.all([
      LogisticsVendor.find(filter).sort({ [safeSortBy]: direction })
        .skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      LogisticsVendor.countDocuments(filter),
    ]);

    const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
    return { data, pagination: {
      page: safePage, limit: safeLimit, total, totalPages,
      hasNextPage: safePage < totalPages, hasPreviousPage: safePage > 1,
    }};
  }

  async updateById({ companyId, vendorId, payload }) {
    return LogisticsVendor.findOneAndUpdate(
      { _id: vendorId, companyId, isActive: true },
      { $set: payload }, { new: true, runValidators: true }
    ).lean();
  }

  async softDelete({ companyId, vendorId, userId }) {
    return LogisticsVendor.findOneAndUpdate(
      { _id: vendorId, companyId, isActive: true },
      { $set: { isActive: false, updatedBy: userId } }, { new: true }
    ).lean();
  }

  async summary(companyId) {
    return LogisticsVendor.aggregate([
      { $match: { companyId, isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 }, openingPayable: { $sum: "$openingPayable" } } },
    ]);
  }

  async latestCode({ companyId, dateCode }) {
    return LogisticsVendor.findOne({
      companyId, vendorCode: { $regex: new RegExp(`^VEN-${dateCode}-`, "i") },
    }).sort({ vendorCode: -1 }).select("vendorCode").lean();
  }

  async codeExists({ companyId, vendorCode }) {
    return LogisticsVendor.exists({ companyId, vendorCode });
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

function normalizeCategory(value) {
  return ({
    "air-cargo": "air_cargo", "sea-freight": "sea_freight",
    "road-transport": "road_transport", "customs-cha": "customs_cha",
    "multi-service": "multi_service",
  })[value] || value;
}

export const logisticsVendorRepository = new LogisticsVendorRepository();
export default logisticsVendorRepository;
