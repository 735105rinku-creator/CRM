import { Shift } from "../models/Shift.js";
import { AttendancePolicy } from "../models/AttendancePolicy.js";
import { Attendance } from "../models/Attendance.js";
import { AttendanceRegularization } from "../models/AttendanceRegularization.js";

/* ============================================================
   SHIFT
============================================================ */

export const createShiftRecord = async (payload) => {
  return Shift.create(payload);
};

export const findShiftById = async (id) => {
  return Shift.findById(id);
};

export const findShiftByCode = async (companyId, shiftCode) => {
  return Shift.findOne({
    companyId,
    shiftCode,
  });
};

export const listShifts = async ({
  filter,
  page,
  limit,
  sort,
}) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Shift.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Shift.countDocuments(filter),
  ]);

  return {
    shifts: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateShiftById = async (id, payload) => {
  return Shift.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteShiftById = async (id) => {
  return Shift.findByIdAndDelete(id);
};

/* ============================================================
   ATTENDANCE POLICY
============================================================ */

export const createAttendancePolicyRecord = async (payload) => {
  return AttendancePolicy.create(payload);
};

export const findAttendancePolicyById = async (id) => {
  return AttendancePolicy.findById(id);
};

export const findAttendancePolicyByCode = async (
  companyId,
  policyCode
) => {
  return AttendancePolicy.findOne({
    companyId,
    policyCode,
  });
};

export const listAttendancePolicies = async ({
  filter,
  page,
  limit,
  sort,
}) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    AttendancePolicy.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    AttendancePolicy.countDocuments(filter),
  ]);

  return {
    policies: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateAttendancePolicyById = async (
  id,
  payload
) => {
  return AttendancePolicy.findByIdAndUpdate(
    id,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );
};

export const deleteAttendancePolicyById = async (id) => {
  return AttendancePolicy.findByIdAndDelete(id);
};

/* ============================================================
   DAILY ATTENDANCE
============================================================ */

export const createAttendanceRecord = async (payload) => {
  return Attendance.create(payload);
};

export const findAttendanceById = async (id) => {
  return Attendance.findById(id);
};

export const findAttendanceByEmployeeAndDate = async (
  companyId,
  employeeId,
  attendanceDate
) => {
  return Attendance.findOne({
    companyId,
    employeeId,
    attendanceDate,
  });
};

export const updateAttendanceById = async (
  id,
  payload
) => {
  return Attendance.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteAttendanceById = async (id) => {
  return Attendance.findByIdAndDelete(id);
};

export const listAttendance = async ({
  filter,
  page,
  limit,
  sort,
}) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Attendance.find(filter)
      .populate("employeeId", "displayName employeeCode")
      .populate("shiftId", "shiftName")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Attendance.countDocuments(filter),
  ]);

  return {
    attendance: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ============================================================
   REGULARIZATION
============================================================ */

export const createRegularizationRecord = async (
  payload
) => {
  return AttendanceRegularization.create(payload);
};

export const findRegularizationById = async (id) => {
  return AttendanceRegularization.findById(id);
};

export const updateRegularizationById = async (
  id,
  payload
) => {
  return AttendanceRegularization.findByIdAndUpdate(
    id,
    payload,
    {
      new: true,
      runValidators: true,
    }
  );
};

export const listRegularizations = async ({
  filter,
  page,
  limit,
  sort,
}) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    AttendanceRegularization.find(filter)
      .populate(
        "employeeId",
        "displayName employeeCode"
      )
      .populate(
        "attendanceId",
        "attendanceDate status"
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    AttendanceRegularization.countDocuments(filter),
  ]);

  return {
    regularizations: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const deleteRegularizationById = async (
  id
) => {
  return AttendanceRegularization.findByIdAndDelete(id);
};

/* ============================================================
   DASHBOARD
============================================================ */

export const countAttendance = async (filter) => {
  return Attendance.countDocuments(filter);
};

export const todayAttendanceSummary = async (
  companyId,
  today
) => {
  return Attendance.aggregate([
    {
      $match: {
        companyId,
        attendanceDate: today,
      },
    },
    {
      $group: {
        _id: "$status",
        total: {
          $sum: 1,
        },
      },
    },
  ]);
};

export const monthlyAttendanceSummary = async (
  companyId,
  employeeId,
  from,
  to
) => {
  return Attendance.find({
    companyId,
    employeeId,
    attendanceDate: {
      $gte: from,
      $lte: to,
    },
  }).sort({
    attendanceDate: 1,
  });
};