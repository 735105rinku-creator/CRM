import { Holiday } from "../models/Holiday.js";

const normalizeText = (value) => {
  if (!value) return value;
  return String(value).trim();
};

export const createHolidayRecord = async (payload) => {
  return Holiday.create(payload);
};

export const findHolidayById = async (id) => {
  return Holiday.findById(id);
};

export const findHolidayByDateName = async ({
  companyId,
  branchId,
  date,
  holidayName,
}) => {
  return Holiday.findOne({
    companyId,
    branchId: branchId || null,
    date,
    holidayName: normalizeText(holidayName),
  });
};

export const listHolidays = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Holiday.find(filter)
      .populate("branchId", "branchName branchCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Holiday.countDocuments(filter),
  ]);

  return {
    holidays: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateHolidayById = async (id, payload) => {
  return Holiday.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteHolidayById = async (id) => {
  return Holiday.findByIdAndDelete(id);
};

export const getUpcomingHolidays = async (companyId, limit = 10) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Holiday.find({
    companyId,
    date: { $gte: today },
    isActive: true,
  })
    .populate("branchId", "branchName branchCode")
    .sort({ date: 1 })
    .limit(limit)
    .lean();
};

export const countHolidays = async (filter) => {
  return Holiday.countDocuments(filter);
};