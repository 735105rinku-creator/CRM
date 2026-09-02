import { LeaveType } from "../models/LeaveType.js";
import { LeavePolicy } from "../models/LeavePolicy.js";
import { LeaveBalance } from "../models/LeaveBalance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";

/* ================= LEAVE TYPE ================= */

export const createLeaveTypeRecord = async (payload) => {
  return LeaveType.create(payload);
};

export const findLeaveTypeById = async (id) => {
  return LeaveType.findById(id);
};

export const findLeaveTypeByCode = async (companyId, leaveCode) => {
  return LeaveType.findOne({
    companyId,
    leaveCode,
  });
};

export const listLeaveTypes = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    LeaveType.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    LeaveType.countDocuments(filter),
  ]);

  return {
    leaveTypes: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateLeaveTypeById = async (id, payload) => {
  return LeaveType.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteLeaveTypeById = async (id) => {
  return LeaveType.findByIdAndDelete(id);
};

/* ================= LEAVE POLICY ================= */

export const createLeavePolicyRecord = async (payload) => {
  return LeavePolicy.create(payload);
};

export const findLeavePolicyById = async (id) => {
  return LeavePolicy.findById(id);
};

export const findLeavePolicyByCode = async (companyId, policyCode) => {
  return LeavePolicy.findOne({
    companyId,
    policyCode,
  });
};

export const listLeavePolicies = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    LeavePolicy.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    LeavePolicy.countDocuments(filter),
  ]);

  return {
    leavePolicies: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateLeavePolicyById = async (id, payload) => {
  return LeavePolicy.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteLeavePolicyById = async (id) => {
  return LeavePolicy.findByIdAndDelete(id);
};

/* ================= LEAVE BALANCE ================= */

export const createLeaveBalanceRecord = async (payload) => {
  return LeaveBalance.create(payload);
};

export const findLeaveBalance = async ({
  companyId,
  employeeId,
  leaveTypeId,
  year,
}) => {
  return LeaveBalance.findOne({
    companyId,
    employeeId,
    leaveTypeId,
    year,
  });
};

export const findLeaveBalanceById = async (id) => {
  return LeaveBalance.findById(id);
};

export const updateLeaveBalanceById = async (id, payload) => {
  return LeaveBalance.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const listLeaveBalances = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    LeaveBalance.find(filter)
      .populate("employeeId", "displayName employeeCode")
      .populate("leaveTypeId", "leaveName leaveCode category")
      .populate("leavePolicyId", "policyName policyCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    LeaveBalance.countDocuments(filter),
  ]);

  return {
    leaveBalances: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ================= LEAVE REQUEST ================= */

export const createLeaveRequestRecord = async (payload) => {
  return LeaveRequest.create(payload);
};

export const findLeaveRequestById = async (id) => {
  return LeaveRequest.findById(id);
};

export const listLeaveRequests = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate("employeeId", "displayName employeeCode")
      .populate("leaveTypeId", "leaveName leaveCode category")
      .populate("leavePolicyId", "policyName policyCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    LeaveRequest.countDocuments(filter),
  ]);

  return {
    leaveRequests: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateLeaveRequestById = async (id, payload) => {
  return LeaveRequest.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const countLeaveRequests = async (filter) => {
  return LeaveRequest.countDocuments(filter);
};

export const getLeaveCalendar = async ({ companyId, from, to }) => {
  return LeaveRequest.find({
    companyId,
    status: "approved",
    fromDate: { $lte: to },
    toDate: { $gte: from },
  })
    .populate("employeeId", "displayName employeeCode")
    .populate("leaveTypeId", "leaveName leaveCode colorCode")
    .sort({ fromDate: 1 })
    .lean();
};