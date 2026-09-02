import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";
import { User } from "../models/User.js";
import { NOTIFICATION_TYPE } from "../models/Notification.js";

import {
  findEmployeeById,
  findEmployeeByCode,
  findEmployeeProfile,
} from "../repositories/employee.repository.js";

import {
  createMeetingRecord,
  findMeetingById,
  findMeetingByCode,
  listMeetings,
  updateMeetingById,
  addMeetingChatMessage,
  deleteMeetingById,
  countMeetings,
  getUpcomingMeetings,
} from "../repositories/meeting.repository.js";
import { createNotificationRecord } from "../repositories/communication.repository.js";
import { emitNotificationToUser } from "../socket/socket.js";

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureMeetingAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPER_ADMIN, ROLES.EMPLOYEE].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage meetings.");
  }
};

const ensureSameCompany = (companyId, record, message = "Meeting not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const resolveMeeting = async (companyId, idOrCode) => {
  let meeting = null;

  if (isMongoId(idOrCode)) {
    meeting = await findMeetingById(idOrCode);
  }

  if (!meeting) {
    meeting = await findMeetingByCode(companyId, normalizeCode(idOrCode));
  }

  ensureSameCompany(companyId, meeting, "Meeting not found.");

  return meeting;
};

const attendeeEmployeeId = (attendee) => {
  const employeeId = attendee?.employeeId;
  return employeeId?._id || employeeId;
};

const attendeeUserId = (attendee) => {
  const userId = attendee?.userId || attendee?.employeeId?.userId;
  return userId?._id || userId;
};

const sameId = (left, right) => {
  return left && right && left.toString() === right.toString();
};

const findAttendeeForUser = (meeting, currentUser, employee = null) => {
  return (meeting.attendees || []).find((attendee) => {
    const invitedUserId = attendeeUserId(attendee);
    const invitedEmployeeId = attendeeEmployeeId(attendee);

    return (
      sameId(invitedUserId, currentUser?._id) ||
      sameId(invitedEmployeeId, employee?._id)
    );
  });
};

const attendeePayload = (attendee, status = attendee.status || "invited") => ({
  employeeId: attendeeEmployeeId(attendee) || null,
  userId: attendeeUserId(attendee) || null,
  status,
});


const isMeetingHost = (currentUser, meeting) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  return meeting?.createdBy && currentUser?._id && meeting.createdBy.toString() === currentUser._id.toString();
};

const ensureMeetingHostAccess = (currentUser, meeting) => {
  if (!isMeetingHost(currentUser, meeting)) {
    throw new ApiError(403, "Only the meeting host can manage this meeting.");
  }
};
const isInvitedEmployee = (meeting, employeeId) => {
  if (!employeeId) return false;
  return (meeting.attendees || []).some((attendee) => sameId(attendeeEmployeeId(attendee), employeeId));
};

const isInvitedUser = (meeting, userId) => {
  if (!userId) return false;
  return (meeting.attendees || []).some((attendee) => sameId(attendeeUserId(attendee), userId));
};

const ensureMeetingJoinAccess = async (currentUser, companyId, meeting) => {
  if (isMeetingHost(currentUser, meeting)) {
    return null;
  }

  const employee = await findEmployeeProfile({ companyId, userId: currentUser._id });

  if (!isInvitedUser(meeting, currentUser._id) && !isInvitedEmployee(meeting, employee?._id)) {
    throw new ApiError(403, "You are not invited to this meeting.");
  }

  return employee;
};

const meetingToObject = (meeting) => {
  return typeof meeting?.toObject === "function" ? meeting.toObject() : meeting;
};

const meetingWithCurrentJoinStatus = async (currentUser, companyId, meeting) => {
  const row = meetingToObject(meeting);

  if (isMeetingHost(currentUser, row)) {
    return { ...row, currentUserJoinStatus: "host" };
  }

  const employee = await findEmployeeProfile({ companyId, userId: currentUser._id });
  const attendee = findAttendeeForUser(row, currentUser, employee);

  return {
    ...row,
    currentUserJoinStatus: attendee?.status || "not_invited",
  };
};

const resolveEmployee = async (
  companyId,
  payload = {},
  message = "Employee not found."
) => {
  const employeeId =
    payload.employeeId ||
    payload.organizerId ||
    payload.assignedTo;

  const employeeCode = normalizeCode(
    payload.employeeCode ||
      payload.organizerCode ||
      payload.organizerEmployeeCode ||
      payload.assignedToEmployeeCode
  );

  if (!hasValue(employeeId) && !employeeCode) {
    return null;
  }

  let employee = null;

  if (hasValue(employeeId)) {
    employee = await findEmployeeById(employeeId);
  }

  if (!employee && employeeCode) {
    employee = await findEmployeeByCode(companyId, employeeCode);
  }

  if (!employee || employee.companyId.toString() !== companyId.toString()) {
    throw new ApiError(400, message);
  }

  return employee;
};

const resolveAttendeeUser = async (companyId, attendee = {}) => {
  const userId = attendee.userId || attendee.attendeeUserId;
  if (!hasValue(userId)) return null;

  const user = await User.findOne({
    _id: userId,
    companyId,
  }).select("_id role status employeeCode");

  if (!user) {
    throw new ApiError(400, "Invalid attendee user for this company.");
  }

  return user;
};

const normalizeAttendees = async (companyId, attendees = []) => {
  const normalized = [];
  const seen = new Set();

  for (const attendee of attendees) {
    if (
      !hasValue(attendee?.employeeId) &&
      !normalizeCode(attendee?.employeeCode) &&
      !hasValue(attendee?.userId) &&
      !hasValue(attendee?.attendeeUserId)
    ) {
      continue;
    }

    let employee = null;
    let user = null;

    if (hasValue(attendee?.employeeId) || normalizeCode(attendee?.employeeCode)) {
      employee = await resolveEmployee(
        companyId,
        attendee,
        "Invalid attendee for this company."
      );

      if (employee?.userId) {
        user = await User.findById(employee.userId).select("_id role status employeeCode");
      }
    } else {
      user = await resolveAttendeeUser(companyId, attendee);

      if (user?.role === ROLES.EMPLOYEE) {
        employee = await findEmployeeProfile({ companyId, userId: user._id });
      }
    }

    const key = user?._id?.toString() || employee?._id?.toString();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);

    normalized.push({
      employeeId: employee?._id || null,
      userId: user?._id || employee?.userId || null,
      status: attendee.status || "invited",
    });
  }

  return normalized;
};

const normalizeActionItems = async (companyId, actionItems = []) => {
  const normalized = [];

  for (const item of actionItems) {
    const row = { ...item };

    const employee = await resolveEmployee(
      companyId,
      {
        assignedTo: item.assignedTo,
        assignedToEmployeeCode: item.assignedToEmployeeCode || item.employeeCode,
      },
      "Invalid action item employee for this company."
    );

    row.assignedTo = employee?._id || null;

    delete row.assignedToEmployeeCode;
    delete row.employeeCode;

    normalized.push(row);
  }

  return normalized;
};

const resolveInviteUsers = async (companyId, payload = {}, currentUser) => {
  const usersById = new Map();
  const attendees = await normalizeAttendees(companyId, payload.attendees || []);

  for (const attendee of attendees) {
    const userId = attendee.userId;
    if (userId) {
      usersById.set(userId.toString(), userId);
    }
  }

  if (payload.inviteCompanyAdmins) {
    const admins = await User.find({
      companyId,
      role: ROLES.COMPANY_ADMIN,
      _id: { $ne: currentUser._id },
    }).select("_id");

    for (const admin of admins) {
      usersById.set(admin._id.toString(), admin._id);
    }
  }

  usersById.delete(currentUser._id.toString());

  return Array.from(usersById.values());
};

const notifyMeetingInvitees = async ({ companyId, currentUser, meeting, inviteUsers }) => {
  if (!inviteUsers.length) return;

  await Promise.all(
    inviteUsers.map(async (recipientUserId) => {
      const notification = await createNotificationRecord({
        companyId,
        recipientUserId,
        senderUserId: currentUser._id,
        type: NOTIFICATION_TYPE.MEETING,
        title: "Meeting invite",
        message: `${meeting.meetingTitle} starts ${new Date(meeting.startDateTime).toLocaleString("en-IN")}.`,
        entityType: "HRMeeting",
        entityId: meeting._id,
        actionUrl: meeting.meetingLink || "",
        createdBy: currentUser._id,
      });

      emitNotificationToUser(recipientUserId.toString(), notification);
    })
  );
};

const normalizeMeetingPayload = async (
  companyId,
  payload = {},
  partial = false
) => {
  const normalized = { ...payload };

  if (
    !partial ||
    "organizerId" in payload ||
    "organizerCode" in payload ||
    "organizerEmployeeCode" in payload
  ) {
    const organizer = await resolveEmployee(
      companyId,
      {
        organizerId: payload.organizerId,
        organizerCode: payload.organizerCode,
        organizerEmployeeCode: payload.organizerEmployeeCode,
      },
      "Invalid organizer for this company."
    );

    normalized.organizerId = organizer?._id || null;
  }

  if (!partial || "attendees" in payload) {
    normalized.attendees = await normalizeAttendees(
      companyId,
      payload.attendees || []
    );
  }

  if (!partial || "actionItems" in payload) {
    normalized.actionItems = await normalizeActionItems(
      companyId,
      payload.actionItems || []
    );
  }

  if (payload.meetingCode) {
    normalized.meetingCode = normalizeCode(payload.meetingCode);
  }

  delete normalized.organizerCode;
  delete normalized.organizerEmployeeCode;

  return normalized;
};

export const createMeetingService = async (currentUser, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const meetingCode = normalizeCode(payload.meetingCode);

  const exists = await findMeetingByCode(companyId, meetingCode);

  if (exists) {
    throw new ApiError(409, "Meeting code already exists.");
  }

  const inviteUsers = payload.notifyAttendees
    ? await resolveInviteUsers(companyId, payload, currentUser)
    : [];

  const normalizedPayload = await normalizeMeetingPayload(
    companyId,
    {
      ...payload,
      meetingCode,
    },
    false
  );

  delete normalizedPayload.inviteCompanyAdmins;

  const meeting = await createMeetingRecord({
    ...normalizedPayload,
    companyId,
    createdBy: currentUser._id,
  });

  await notifyMeetingInvitees({ companyId, currentUser, meeting, inviteUsers });

  return meeting;
};

export const getMeetingsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.status) {
    filter.status = query.status;
  }

  if (currentUser.role === ROLES.EMPLOYEE) {
    filter.status = "scheduled";
    const employee = await findEmployeeProfile({ companyId, userId: currentUser._id });

    if (!employee) {
      return {
        meetings: [],
        pagination: { total: 0, page, limit, pages: 0 },
      };
    }

    filter.$or = [{ "attendees.employeeId": employee._id }, { createdBy: currentUser._id }];
  }

  if (query.meetingMode) {
    filter.meetingMode = query.meetingMode;
  }

  if (query.meetingCode) {
    filter.meetingCode = normalizeCode(query.meetingCode);
  }

  if (query.organizerId) {
    filter.organizerId = query.organizerId;
  }

  if (query.organizerCode || query.organizerEmployeeCode) {
    const organizer = await resolveEmployee(
      companyId,
      {
        organizerCode: query.organizerCode,
        organizerEmployeeCode: query.organizerEmployeeCode,
      },
      "Organizer not found."
    );

    filter.organizerId = organizer._id;
  }

  if (query.attendeeEmployeeId || query.employeeId) {
    filter["attendees.employeeId"] =
      query.attendeeEmployeeId || query.employeeId;
  }

  if (query.attendeeEmployeeCode || query.employeeCode) {
    const employee = await resolveEmployee(
      companyId,
      {
        employeeCode: query.attendeeEmployeeCode || query.employeeCode,
      },
      "Attendee not found."
    );

    filter.$or = [{ "attendees.employeeId": employee._id }, { createdBy: currentUser._id }];
  }

  if (query.from || query.to) {
    filter.startDateTime = {};

    if (query.from) {
      filter.startDateTime.$gte = new Date(query.from);
    }

    if (query.to) {
      filter.startDateTime.$lte = new Date(query.to);
    }
  }

  if (query.search) {
    filter.$or = [
      { meetingTitle: { $regex: query.search, $options: "i" } },
      { meetingCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listMeetings({
    filter,
    page,
    limit,
    sort: { startDateTime: 1 },
  });
};

export const getMeetingByIdService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  await ensureMeetingJoinAccess(currentUser, companyId, meeting);

  return meetingWithCurrentJoinStatus(currentUser, companyId, meeting);
};

export const updateMeetingService = async (currentUser, idOrCode, payload) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  ensureMeetingHostAccess(currentUser, meeting);

  if (
    payload.meetingCode &&
    normalizeCode(payload.meetingCode) !== meeting.meetingCode
  ) {
    const exists = await findMeetingByCode(companyId, payload.meetingCode);

    if (exists && exists._id.toString() !== meeting._id.toString()) {
      throw new ApiError(409, "Meeting code already exists.");
    }
  }

  const normalizedPayload = await normalizeMeetingPayload(
    companyId,
    payload,
    true
  );

  return updateMeetingById(meeting._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateMeetingStatusService = async (
  currentUser,
  idOrCode,
  payload
) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  ensureMeetingHostAccess(currentUser, meeting);

  return updateMeetingById(meeting._id, {
    status: payload.status,
    remarks: payload.remarks || meeting.remarks,
    updatedBy: currentUser._id,
  });
};

export const joinMeetingService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  const employee = await ensureMeetingJoinAccess(currentUser, companyId, meeting);
  const recipientsById = new Map();
if (isMeetingHost(currentUser, meeting)) {
    return { joined: true, host: true };
  }
const currentAttendee = findAttendeeForUser(meeting, currentUser, employee);

  if (!["accepted", "attended"].includes(currentAttendee?.status || "")) {
    const attendees = (meeting.attendees || []).map((attendee) => {
      const isCurrent = attendee === currentAttendee || sameId(attendeeUserId(attendee), currentUser._id) || sameId(attendeeEmployeeId(attendee), employee?._id);
      return attendeePayload(attendee, isCurrent ? "requested" : attendee.status || "invited");
    });

    await updateMeetingById(meeting._id, { attendees, updatedBy: currentUser._id });

    const hostRecipients = meeting.createdBy && meeting.createdBy.toString() !== currentUser._id.toString()
      ? [{ _id: meeting.createdBy }]
      : await User.find({
          companyId,
          role: { $in: [ROLES.COMPANY_ADMIN, ROLES.HR] },
          _id: { $ne: currentUser._id },
        }).select("_id");

    await Promise.all(
      hostRecipients.map(async (recipient) => {
        const notification = await createNotificationRecord({
          companyId,
          recipientUserId: recipient._id,
          senderUserId: currentUser._id,
          type: NOTIFICATION_TYPE.MEETING,
          title: "Meeting join request",
          message: `${currentUser.name || currentUser.email || "Employee"} requested to join ${meeting.meetingTitle}.`,
          entityType: "HRMeeting",
          entityId: meeting._id,
          actionUrl: meeting.meetingLink || "",
          createdBy: currentUser._id,
        });

        emitNotificationToUser(recipient._id.toString(), notification);
      })
    );

    return { joined: false, requiresApproval: true, status: "requested" };
  }

  for (const attendee of meeting.attendees || []) {
    const userId = attendeeUserId(attendee);
    if (userId) {
      recipientsById.set(userId.toString(), userId);
      continue;
    }

    if (!attendee.employeeId) continue;
    const attendeeEmployee = attendee.employeeId?.userId ? attendee.employeeId : await findEmployeeById(attendeeEmployeeId(attendee));
    if (attendeeEmployee?.userId) {
      recipientsById.set(attendeeEmployee.userId.toString(), attendeeEmployee.userId);
    }
  }

  const admins = await User.find({
    companyId,
    role: ROLES.COMPANY_ADMIN,
    _id: { $ne: currentUser._id },
  }).select("_id");

  for (const admin of admins) {
    recipientsById.set(admin._id.toString(), admin._id);
  }

  recipientsById.delete(currentUser._id.toString());

  const joiner = currentUser.name || currentUser.email || "An invited user";

  if (currentAttendee) {
    const attendees = (meeting.attendees || []).map((attendee) => {
      const isCurrent = attendee === currentAttendee || sameId(attendeeUserId(attendee), currentUser._id) || sameId(attendeeEmployeeId(attendee), employee?._id);
      return attendeePayload(attendee, isCurrent ? "attended" : attendee.status || "invited");
    });

    await updateMeetingById(meeting._id, { attendees, updatedBy: currentUser._id });
  }

  await Promise.all(
    Array.from(recipientsById.values()).map(async (recipientUserId) => {
      const notification = await createNotificationRecord({
        companyId,
        recipientUserId,
        senderUserId: currentUser._id,
        type: NOTIFICATION_TYPE.MEETING,
        title: "Meeting joined",
        message: `${joiner} joined ${meeting.meetingTitle}.`,
        entityType: "HRMeeting",
        entityId: meeting._id,
        actionUrl: meeting.meetingLink || "",
        createdBy: currentUser._id,
      });

      emitNotificationToUser(recipientUserId.toString(), notification);
    })
  );

  return { joined: true };
};

export const leaveMeetingService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  const employee = await ensureMeetingJoinAccess(currentUser, companyId, meeting);

  const currentAttendee = findAttendeeForUser(meeting, currentUser, employee);

  if (!currentAttendee) {
    return { left: true };
  }

  const attendees = (meeting.attendees || []).map((attendee) => {
    const isCurrent = attendee === currentAttendee || sameId(attendeeUserId(attendee), currentUser._id) || sameId(attendeeEmployeeId(attendee), employee?._id);
    return attendeePayload(attendee, isCurrent ? "accepted" : attendee.status || "invited");
  });

  await updateMeetingById(meeting._id, { attendees, updatedBy: currentUser._id });

  return { left: true };
};

export const approveMeetingJoinService = async (currentUser, idOrCode, payload = {}) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  ensureMeetingHostAccess(currentUser, meeting);

  const employee = (payload.employeeId || payload.employeeCode)
    ? await resolveEmployee(
        companyId,
        { employeeId: payload.employeeId, employeeCode: payload.employeeCode },
        "Employee not found for this meeting."
      )
    : null;

  const user = (payload.userId || payload.attendeeUserId)
    ? await resolveAttendeeUser(companyId, { userId: payload.userId || payload.attendeeUserId })
    : null;

  const targetAttendee = (meeting.attendees || []).find((attendee) => (
    sameId(attendeeEmployeeId(attendee), employee?._id) ||
    sameId(attendeeUserId(attendee), user?._id)
  ));

  if (!targetAttendee) {
    throw new ApiError(404, "User is not invited to this meeting.");
  }

  const status = payload.status === "declined" ? "declined" : "accepted";
  const attendees = (meeting.attendees || []).map((attendee) => {
    const isTarget = attendee === targetAttendee ||
      sameId(attendeeEmployeeId(attendee), employee?._id) ||
      sameId(attendeeUserId(attendee), user?._id);
    return attendeePayload(attendee, isTarget ? status : attendee.status || "invited");
  });

  const updated = await updateMeetingById(meeting._id, { attendees, updatedBy: currentUser._id });
  const recipientUserId = user?._id || employee?.userId || attendeeUserId(targetAttendee);

  if (recipientUserId) {
    const notification = await createNotificationRecord({
      companyId,
      recipientUserId,
      senderUserId: currentUser._id,
      type: NOTIFICATION_TYPE.MEETING,
      title: status === "accepted" ? "Meeting join approved" : "Meeting join declined",
      message: status === "accepted" ? `You can join ${meeting.meetingTitle} now.` : `Your request to join ${meeting.meetingTitle} was declined.`,
      entityType: "HRMeeting",
      entityId: meeting._id,
      actionUrl: meeting.meetingLink || "",
      createdBy: currentUser._id,
    });

    emitNotificationToUser(recipientUserId.toString(), notification);
  }

  return updated;
};

export const sendMeetingMessageService = async (currentUser, idOrCode, payload = {}) => {
  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  await ensureMeetingJoinAccess(currentUser, companyId, meeting);

  const message = String(payload.message || "").trim();
  if (!message) {
    throw new ApiError(400, "Message is required.");
  }

  const updated = await addMeetingChatMessage(meeting._id, {
    senderUserId: currentUser._id,
    senderName: currentUser.name || currentUser.email || "Meeting user",
    message,
  });

  return meetingWithCurrentJoinStatus(currentUser, companyId, updated);
};

export const getMeetingMessagesService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  await ensureMeetingJoinAccess(currentUser, companyId, meeting);

  return {
    chatMessages: meeting.chatMessages || [],
  };
};

export const deleteMeetingService = async (currentUser, idOrCode) => {
  ensureMeetingAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const meeting = await resolveMeeting(companyId, idOrCode);
  ensureMeetingHostAccess(currentUser, meeting);

  await deleteMeetingById(meeting._id);

  return true;
};

export const getMeetingDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalMeetings = await countMeetings({ companyId });
  const upcomingMeetings = await getUpcomingMeetings(companyId, 10);

  return {
    totalMeetings,
    upcomingMeetings,
  };
};










