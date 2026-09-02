import { HREvent } from "../models/HREvent.js";

const normalizeCode = (value) => {
  if (!value) return value;
  return String(value).trim().toUpperCase();
};

export const createEventRecord = async (payload) => {
  return HREvent.create(payload);
};

export const findEventById = async (id) => {
  return HREvent.findById(id);
};

export const findEventByCode = async (companyId, eventCode) => {
  if (!eventCode) return null;

  return HREvent.findOne({
    companyId,
    eventCode: normalizeCode(eventCode),
  });
};

export const listEvents = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    HREvent.find(filter)
      .populate("participants.employeeId", "displayName employeeCode officialEmail mobile")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    HREvent.countDocuments(filter),
  ]);

  return {
    events: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateEventById = async (id, payload) => {
  return HREvent.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteEventById = async (id) => {
  return HREvent.findByIdAndDelete(id);
};

export const countEvents = async (filter) => {
  return HREvent.countDocuments(filter);
};

export const getUpcomingEvents = async (companyId, limit = 10) => {
  return HREvent.find({
    companyId,
    startDateTime: { $gte: new Date() },
    status: { $in: ["published", "draft"] },
  })
    .populate("participants.employeeId", "displayName employeeCode officialEmail mobile")
    .sort({ startDateTime: 1 })
    .limit(limit)
    .lean();
};