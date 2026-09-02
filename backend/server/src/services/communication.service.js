import { ApiError } from "../utils/apiError.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";
import { User } from "../models/User.js";
import { NOTIFICATION_TYPE } from "../models/Notification.js";

import {
  findEmployeeByCode,
  findEmployeeProfile,
  listEmployees,
} from "../repositories/employee.repository.js";

import {
  createMessageRecord,
  findMessageById,
  listMessages,
  updateMessageById,
  createNotificationRecord,
  findNotificationById,
  listNotifications,
  updateNotificationById,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "../repositories/communication.repository.js";

import {
  emitNotificationToUser,
  emitMessageToUser,
} from "../socket/socket.js";

const hasValue = (value) => {
  return value !== undefined && value !== null && value !== "";
};

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const normalizeEmail = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toLowerCase();
};

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const canSendCommunication = (currentUser) => {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.COMPANY_ADMIN,
    ROLES.HR,
  ].includes(currentUser.role);
};

const ensureCommunicationAccess = (currentUser) => {
  if (!canSendCommunication(currentUser)) {
    throw new ApiError(403, "You are not allowed to send communication.");
  }
};

const ensureSameCompanyRecord = (
  currentUser,
  record,
  message = "Record not found."
) => {
  if (!record) {
    throw new ApiError(404, message);
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return;
  }

  const companyId = getCompanyId(currentUser).toString();

  if (record.companyId.toString() !== companyId) {
    throw new ApiError(403, "You cannot access another company's data.");
  }
};

const resolveCompanyIdForCommunication = (currentUser, recipient) => {
  if (currentUser.role === ROLES.SUPER_ADMIN) {
    if (!recipient.companyId) {
      throw new ApiError(400, "Recipient has no company assigned.");
    }

    return recipient.companyId;
  }

  return getCompanyId(currentUser);
};

const resolveRecipientUser = async (currentUser, payload = {}) => {
  let recipient = null;

  if (payload.recipientUserId) {
    recipient = await User.findById(payload.recipientUserId);
  }

  if (!recipient && payload.recipientEmail) {
    recipient = await User.findOne({
      email: normalizeEmail(payload.recipientEmail),
    });
  }

  if (
    !recipient &&
    (payload.recipientEmployeeCode || payload.employeeCode)
  ) {
    if (currentUser.role === ROLES.SUPER_ADMIN && !currentUser.companyId) {
      throw new ApiError(
        400,
        "Company context is required to find recipient by employee code."
      );
    }

    const companyId = getCompanyId(currentUser);

    const employee = await findEmployeeByCode(
      companyId,
      normalizeCode(payload.recipientEmployeeCode || payload.employeeCode)
    );

    if (!employee) {
      throw new ApiError(404, "Recipient employee not found.");
    }

    if (!employee.userId) {
      throw new ApiError(400, "Recipient employee has no user account.");
    }

    recipient = await User.findById(employee.userId);
  }

  if (!recipient) {
    throw new ApiError(404, "Recipient user not found.");
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) {
    return recipient;
  }

  const senderCompanyId = getCompanyId(currentUser).toString();
  const recipientCompanyId = recipient.companyId?.toString();

  if (senderCompanyId !== recipientCompanyId) {
    throw new ApiError(403, "Recipient does not belong to your company.");
  }

  return recipient;
};

const resolveEmployeeMessageRecipient = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const hrOrAdmin = await User.findOne({
    companyId,
    role: ROLES.HR,
    status: USER_STATUS.ACTIVE,
    _id: { $ne: currentUser._id },
  }).sort({ createdAt: 1 }) || await User.findOne({
    companyId,
    role: ROLES.COMPANY_ADMIN,
    status: USER_STATUS.ACTIVE,
    _id: { $ne: currentUser._id },
  }).sort({ createdAt: 1 });

  if (!hrOrAdmin) {
    throw new ApiError(404, "No active HR or company admin found for this company.");
  }

  return hrOrAdmin;
};

/* ================= MESSAGES ================= */

export const sendMessageService = async (currentUser, payload) => {
  let recipient = null;
  let parentMessage = null;

  if (payload.parentMessageId) {
    parentMessage = await findMessageById(payload.parentMessageId);
    ensureSameCompanyRecord(currentUser, parentMessage, "Message not found.");

    const currentUserId = currentUser._id.toString();
    const senderId = parentMessage.senderUserId?._id?.toString?.() || parentMessage.senderUserId.toString();
    const recipientId = parentMessage.recipientUserId?._id?.toString?.() || parentMessage.recipientUserId.toString();

    if (![senderId, recipientId].includes(currentUserId)) {
      throw new ApiError(403, "You cannot reply to this message.");
    }

    const replyRecipientId = currentUserId === senderId ? recipientId : senderId;
    recipient = await User.findById(replyRecipientId);
  } else {
    if (currentUser.role === ROLES.EMPLOYEE) {
      if (payload.recipientEmployeeCode || payload.employeeCode || payload.recipientUserId || payload.recipientEmail) {
        recipient = await resolveRecipientUser(currentUser, payload);
        if (recipient._id.toString() === currentUser._id.toString()) {
          throw new ApiError(400, "You cannot send a message to yourself.");
        }
        if (recipient.role !== ROLES.EMPLOYEE) {
          throw new ApiError(403, "Employees can directly message only other employees.");
        }
      } else {
        recipient = await resolveEmployeeMessageRecipient(currentUser);
      }
    } else {
      ensureCommunicationAccess(currentUser);
      recipient = await resolveRecipientUser(currentUser, payload);
    }
  }

  const companyId = resolveCompanyIdForCommunication(currentUser, recipient);

  const message = await createMessageRecord({
    companyId,
    senderUserId: currentUser._id,
    recipientUserId: recipient._id,
    parentMessageId: parentMessage?._id || null,
    subject: payload.subject || (parentMessage?.subject ? `Re: ${parentMessage.subject}` : ""),
    body: payload.body,
    attachmentUrl: payload.attachmentUrl || "",
    createdBy: currentUser._id,
  });

  const notification = await createNotificationRecord({
    companyId,
    recipientUserId: recipient._id,
    senderUserId: currentUser._id,
    type: NOTIFICATION_TYPE.MESSAGE,
    title: payload.subject || "New Message",
    message: payload.body,
    entityType: "Message",
    entityId: message._id,
    actionUrl: `/messages/${message._id}`,
    createdBy: currentUser._id,
  });

  emitMessageToUser(recipient._id.toString(), message);
  emitNotificationToUser(recipient._id.toString(), notification);

  return {
    message,
    notification,
  };
};

export const getEmployeeMessageRecipientsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);
  const currentEmployee = await findEmployeeProfile({ companyId, userId: currentUser._id });
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 100), 100);

  const result = await listEmployees({
    filter: {
      companyId,
      isActive: true,
      employeeStatus: "active",
      userId: { $ne: null },
      ...(currentEmployee?._id ? { _id: { $ne: currentEmployee._id } } : {}),
    },
    page,
    limit,
    sort: { displayName: 1 },
  });

  const employees = (result.employees || []).map((employee) => ({
    _id: employee._id,
    userId: employee.userId,
    inviteType: "employee",
    role: ROLES.EMPLOYEE,
    employeeCode: employee.employeeCode,
    displayName: employee.displayName,
    officialEmail: employee.officialEmail,
    departmentId: employee.departmentId,
    designationId: employee.designationId,
  }));

  const managementUsers = await User.find({
    companyId,
    role: { $in: [ROLES.HR, ROLES.COMPANY_ADMIN] },
    status: USER_STATUS.ACTIVE,
    _id: { $ne: currentUser._id },
  })
    .select("_id name email mobile role department designation employeeCode")
    .sort({ role: 1, name: 1 })
    .lean();

  const existingUserIds = new Set(employees.map((employee) => employee.userId?.toString()).filter(Boolean));

  for (const user of managementUsers) {
    if (existingUserIds.has(user._id.toString())) continue;

    employees.push({
      _id: user._id,
      userId: user._id,
      inviteType: "user",
      role: user.role,
      employeeCode: user.employeeCode || "",
      displayName: user.name || user.email,
      officialEmail: user.email,
      departmentId: user.department ? { departmentName: user.department } : undefined,
      designationId: user.designation ? { designationName: user.designation } : undefined,
    });
  }

  return {
    employees,
    pagination: {
      ...result.pagination,
      total: employees.length,
    },
  };
};

export const getMessagesService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {
    $or: [
      { senderUserId: currentUser._id },
      { recipientUserId: currentUser._id },
    ],
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return listMessages({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getMessageByIdService = async (currentUser, id) => {
  const message = await findMessageById(id);

  ensureSameCompanyRecord(currentUser, message, "Message not found.");

  const isSender = message.senderUserId.toString() === currentUser._id.toString();
  const isRecipient =
    message.recipientUserId.toString() === currentUser._id.toString();

  if (!isSender && !isRecipient && currentUser.role !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, "You cannot view this message.");
  }

  return message;
};

export const markMessageReadService = async (currentUser, id) => {
  const message = await findMessageById(id);

  ensureSameCompanyRecord(currentUser, message, "Message not found.");

  if (
    message.recipientUserId.toString() !== currentUser._id.toString() &&
    currentUser.role !== ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "Only recipient can mark message as read.");
  }

  return updateMessageById(id, {
    status: "read",
    readAt: new Date(),
    updatedBy: currentUser._id,
  });
};

/* ================= NOTIFICATIONS ================= */

export const sendNotificationService = async (currentUser, payload) => {
  ensureCommunicationAccess(currentUser);

  const recipient = await resolveRecipientUser(currentUser, payload);

  const companyId = resolveCompanyIdForCommunication(currentUser, recipient);

  const notification = await createNotificationRecord({
    companyId,
    recipientUserId: recipient._id,
    senderUserId: currentUser._id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    entityType: payload.entityType || "",
    entityId: payload.entityId || null,
    actionUrl: payload.actionUrl || "",
    createdBy: currentUser._id,
  });

  emitNotificationToUser(recipient._id.toString(), notification);

  return notification;
};

export const getNotificationsService = async (currentUser, query = {}) => {
  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === "true";
  }

  if (query.type) {
    filter.type = query.type;
  }

  return listNotifications({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getUnreadNotificationCountService = async (currentUser) => {
  const filter = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    filter.companyId = getCompanyId(currentUser);
  }

  return {
    unreadCount: await countUnreadNotifications(filter),
  };
};

export const markNotificationReadService = async (currentUser, id) => {
  const notification = await findNotificationById(id);

  ensureSameCompanyRecord(currentUser, notification, "Notification not found.");

  if (
    notification.recipientUserId.toString() !== currentUser._id.toString() &&
    currentUser.role !== ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(403, "You cannot update this notification.");
  }

  return updateNotificationById(id, {
    isRead: true,
    readAt: new Date(),
  });
};

export const markAllNotificationsReadService = async (currentUser) => {
  const payload = {
    recipientUserId: currentUser._id,
  };

  if (currentUser.role !== ROLES.SUPER_ADMIN) {
    payload.companyId = getCompanyId(currentUser);
  }

  await markAllNotificationsRead(payload);

  return true;
};


