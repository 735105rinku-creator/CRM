import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

import {
  findEmployeeById,
  findEmployeeByCode,
} from "../repositories/employee.repository.js";

import {
  createEventRecord,
  findEventById,
  findEventByCode,
  listEvents,
  updateEventById,
  deleteEventById,
  countEvents,
  getUpcomingEvents,
} from "../repositories/event.repository.js";

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

const ensureEventAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage events.");
  }
};

const ensureSameCompany = (companyId, record, message = "Event not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const resolveEvent = async (companyId, idOrCode) => {
  let event = null;

  if (isMongoId(idOrCode)) {
    event = await findEventById(idOrCode);
  }

  if (!event) {
    event = await findEventByCode(companyId, normalizeCode(idOrCode));
  }

  ensureSameCompany(companyId, event, "Event not found.");

  return event;
};

const resolveEmployee = async (companyId, payload = {}) => {
  const employeeId = payload.employeeId;
  const employeeCode = normalizeCode(payload.employeeCode);

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
    throw new ApiError(404, "Employee not found.");
  }

  return employee;
};

const normalizeParticipants = async (companyId, participants = []) => {
  const normalized = [];

  for (const participant of participants) {
    const employee = await resolveEmployee(companyId, participant);

    if (!employee) {
      continue;
    }

    normalized.push({
      employeeId: employee._id,
      status: participant.status || "invited",
    });
  }

  return normalized;
};

const normalizeEventPayload = async (companyId, payload = {}, partial = false) => {
  const normalized = { ...payload };

  if (!partial || "participants" in payload) {
    normalized.participants = await normalizeParticipants(
      companyId,
      payload.participants || []
    );
  }

  delete normalized.employeeCode;

  return normalized;
};

export const createEventService = async (currentUser, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const eventCode = normalizeCode(payload.eventCode);

  const exists = await findEventByCode(companyId, eventCode);

  if (exists) {
    throw new ApiError(409, "Event code already exists.");
  }

  const normalizedPayload = await normalizeEventPayload(
    companyId,
    {
      ...payload,
      eventCode,
    },
    false
  );

  return createEventRecord({
    ...normalizedPayload,
    companyId,
    createdBy: currentUser._id,
  });
};

export const getEventsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = { companyId };

  if (query.eventType) {
    filter.eventType = query.eventType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (currentUser.role === ROLES.EMPLOYEE) {
    filter.status = "published";
  }

  if (query.eventCode) {
    filter.eventCode = normalizeCode(query.eventCode);
  }

  if (query.participantEmployeeCode || query.employeeCode) {
    const employee = await resolveEmployee(companyId, {
      employeeCode: query.participantEmployeeCode || query.employeeCode,
    });

    filter["participants.employeeId"] = employee._id;
  }

  if (query.participantEmployeeId || query.employeeId) {
    filter["participants.employeeId"] =
      query.participantEmployeeId || query.employeeId;
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
      { eventTitle: { $regex: query.search, $options: "i" } },
      { eventCode: { $regex: query.search, $options: "i" } },
    ];
  }

  return listEvents({
    filter,
    page,
    limit,
    sort: { startDateTime: 1 },
  });
};

export const getEventByIdService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);

  return resolveEvent(companyId, idOrCode);
};

export const updateEventService = async (currentUser, idOrCode, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await resolveEvent(companyId, idOrCode);

  if (
    payload.eventCode &&
    normalizeCode(payload.eventCode) !== event.eventCode
  ) {
    const exists = await findEventByCode(companyId, payload.eventCode);

    if (exists && exists._id.toString() !== event._id.toString()) {
      throw new ApiError(409, "Event code already exists.");
    }
  }

  const normalizedPayload = await normalizeEventPayload(
    companyId,
    {
      ...payload,
      eventCode: payload.eventCode
        ? normalizeCode(payload.eventCode)
        : payload.eventCode,
    },
    true
  );

  return updateEventById(event._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateEventStatusService = async (currentUser, idOrCode, payload) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await resolveEvent(companyId, idOrCode);

  return updateEventById(event._id, {
    status: payload.status,
    updatedBy: currentUser._id,
  });
};

export const deleteEventService = async (currentUser, idOrCode) => {
  ensureEventAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const event = await resolveEvent(companyId, idOrCode);

  await deleteEventById(event._id);

  return true;
};

export const getEventDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const totalEvents = await countEvents({ companyId });
  const upcomingEvents = await getUpcomingEvents(companyId, 10);

  return {
    totalEvents,
    upcomingEvents,
  };
};
