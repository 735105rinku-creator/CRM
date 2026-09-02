import { HRMeeting } from "../models/HRMeeting.js";

const normalizeCode = (value) => {
  if (!value) return value;
  return String(value).trim().toUpperCase();
};

export const createMeetingRecord = async (payload) => {
  return HRMeeting.create(payload);
};

const populateMeeting = (query) => {
  return query
    .populate("organizerId", "displayName employeeCode officialEmail mobile departmentId designationId")
    .populate("attendees.employeeId", "displayName employeeCode officialEmail mobile departmentId designationId userId")
    .populate("attendees.userId", "name email mobile role department designation employeeCode")
    .populate("actionItems.assignedTo", "displayName employeeCode officialEmail mobile");
};

export const findMeetingById = async (id) => {
  return populateMeeting(HRMeeting.findById(id));
};

export const findMeetingByCode = async (companyId, meetingCode) => {
  if (!meetingCode) return null;

  return populateMeeting(HRMeeting.findOne({
    companyId,
    meetingCode: normalizeCode(meetingCode),
  }));
};

export const listMeetings = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    HRMeeting.find(filter)
      .populate("organizerId", "displayName employeeCode officialEmail mobile departmentId designationId")
      .populate("attendees.employeeId", "displayName employeeCode officialEmail mobile departmentId designationId userId")
    .populate("attendees.userId", "name email mobile role department designation employeeCode")
      .populate("actionItems.assignedTo", "displayName employeeCode officialEmail mobile")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    HRMeeting.countDocuments(filter),
  ]);

  return {
    meetings: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateMeetingById = async (id, payload) => {
  return HRMeeting.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const addMeetingChatMessage = async (id, message) => {
  return populateMeeting(HRMeeting.findByIdAndUpdate(
    id,
    { $push: { chatMessages: message } },
    {
      new: true,
      runValidators: true,
    }
  ));
};

export const deleteMeetingById = async (id) => {
  return HRMeeting.findByIdAndDelete(id);
};

export const countMeetings = async (filter) => {
  return HRMeeting.countDocuments(filter);
};

export const getUpcomingMeetings = async (companyId, limit = 10) => {
  return HRMeeting.find({
    companyId,
    startDateTime: { $gte: new Date() },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate("organizerId", "displayName employeeCode officialEmail mobile departmentId designationId")
    .populate("attendees.employeeId", "displayName employeeCode officialEmail mobile departmentId designationId userId")
    .populate("attendees.userId", "name email mobile role department designation employeeCode")
    .populate("actionItems.assignedTo", "displayName employeeCode officialEmail mobile")
    .sort({ startDateTime: 1 })
    .limit(limit)
    .lean();
};



