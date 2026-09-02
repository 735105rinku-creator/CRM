import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { EmployeeFamily } from "../models/EmployeeFamily.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { EmployeeStatutory } from "../models/EmployeeStatutory.js";
import { EmployeeDocument } from "../models/EmployeeDocument.js";

import { Branch } from "../models/Branch.js";
import { Department } from "../models/Department.js";
import { Designation } from "../models/Designation.js";
import { Shift } from "../models/Shift.js";
import { AttendancePolicy } from "../models/AttendancePolicy.js";
import { LeavePolicy } from "../models/LeavePolicy.js";
import { SalaryStructure } from "../models/SalaryStructure.js";

const HIDDEN_EMPLOYEE_USER_ROLES = [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN];

export const withVisibleEmployeeFilter = async (filter = {}) => {
  const userFilter = { role: { $in: HIDDEN_EMPLOYEE_USER_ROLES } };
  if (filter.companyId) userFilter.companyId = filter.companyId;

  const users = await User.find(userFilter).select("_id").lean();
  const hiddenUserIds = users.map((user) => user._id);

  if (!hiddenUserIds.length) return filter;

  return {
    $and: [
      filter,
      {
        $or: [
          { userId: { $exists: false } },
          { userId: null },
          { userId: { $nin: hiddenUserIds } },
        ],
      },
    ],
  };
};

export const visibleEmployeeMatchStage = (companyId, match = {}) => ({
  $match: {
    ...match,
    companyId,
    $or: [
      { linkedUserRole: { $exists: false } },
      { linkedUserRole: null },
      { linkedUserRole: { $nin: HIDDEN_EMPLOYEE_USER_ROLES } },
    ],
  },
});

export const employeeUserRoleLookupStages = [
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "linkedUser",
    },
  },
  {
    $addFields: {
      linkedUserRole: { $arrayElemAt: ["$linkedUser.role", 0] },
    },
  },
];
/* ---------------- Employee Core ---------------- */

export const createEmployeeRecord = async (payload) => {
  return Employee.create(payload);
};

export const findEmployeeById = async (id) => {
  return Employee.findById(id);
};

export const findEmployeeByCode = async (companyId, employeeCode) => {
  if (!employeeCode) return null;

  return Employee.findOne({
    companyId,
    employeeCode: employeeCode.toUpperCase().trim(),
  });
};

export const findEmployeeProfile = async ({
  companyId,
  employeeId,
  userId,
  employeeCode,
  officialEmail,
}) => {
  const matchers = [];

  if (employeeId) matchers.push({ _id: employeeId });
  if (userId) matchers.push({ userId });
  if (employeeCode) {
    matchers.push({ employeeCode: employeeCode.toUpperCase().trim() });
  }
  if (officialEmail) {
    matchers.push({ officialEmail: officialEmail.toLowerCase().trim() });
  }

  if (!matchers.length) return null;

  return Employee.findOne({ companyId, $or: matchers })
    .populate("branchId", "branchName branchCode")
    .populate("departmentId", "departmentName departmentCode featureKey dashboardKey accessModules")
    .populate("designationId", "designationName designationCode")
    .populate("reportingManagerId", "displayName employeeCode officialEmail")
    .populate("shiftId", "shiftName shiftCode startTime endTime")
    .lean();
};

export const findEmployeeByOfficialEmail = async (companyId, officialEmail) => {
  if (!officialEmail) return null;

  return Employee.findOne({
    companyId,
    officialEmail: officialEmail.toLowerCase(),
  });
};

export const findEmployeeByMobile = async (companyId, mobile) => {
  if (!mobile) return null;

  return Employee.findOne({
    companyId,
    mobile,
  });
};

export const findLastEmployeeByCompany = async (companyId) => {
  return Employee.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select("employeeCode");
};

export const updateEmployeeById = async (id, payload) => {
  return Employee.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const softDeleteEmployeeById = async (id, updatedBy) => {
  return Employee.findByIdAndUpdate(
    id,
    {
      isActive: false,
      employeeStatus: "inactive",
      updatedBy,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const findEmployeesByManagerIds = async (companyId, managerIds = []) => {
  const ids = managerIds.filter(Boolean);
  if (!ids.length) return [];

  return Employee.find({ companyId, reportingManagerId: { $in: ids }, isActive: true })
    .select("_id userId reportingManagerId")
    .lean();
};

export const listEmployees = async ({ filter, page, limit, sort, currentUser = null }) => {
  const skip = (page - 1) * limit;
  let scopedFilter = filter;
  const roleName = String(currentUser?.roleRef?.name || currentUser?.role || "").toLowerCase();
  const isManager = ["manager", "department_head", "team_leader"].includes(roleName);

  if (isManager && !currentUser?.employee) {
    scopedFilter = { ...filter, _id: { $in: [] } };
  } else if (isManager && currentUser.employee) {
    const directReportees = await findEmployeesByManagerIds(filter.companyId, [currentUser.employee]);
    const secondLevelReportees = await findEmployeesByManagerIds(
      filter.companyId,
      directReportees.map((employee) => employee._id)
    );
    scopedFilter = {
      ...filter,
      _id: {
        $in: [
          currentUser.employee,
          ...directReportees.map((employee) => employee._id),
          ...secondLevelReportees.map((employee) => employee._id),
        ],
      },
    };
  }

  const visibleFilter = await withVisibleEmployeeFilter(scopedFilter);

  const [employees, total] = await Promise.all([
    Employee.find(visibleFilter)
      .populate("branchId", "branchName branchCode")
      .populate("departmentId", "departmentName departmentCode featureKey dashboardKey accessModules")
      .populate("designationId", "designationName designationCode")
      .populate("reportingManagerId", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Employee.countDocuments(visibleFilter),
  ]);

  return {
    employees,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ---------------- Company Setting Validation ---------------- */

export const findBranchById = async (id) => {
  return Branch.findById(id);
};

export const findDepartmentById = async (id) => {
  return Department.findById(id);
};

export const findDesignationById = async (id) => {
  return Designation.findById(id);
};

export const findBranchByCode = async (companyId, branchCode) => {
  if (!branchCode) return null;

  return Branch.findOne({
    companyId,
    branchCode: branchCode.toUpperCase().trim(),
  });
};

export const findDepartmentByCode = async (companyId, departmentCode) => {
  if (!departmentCode) return null;

  return Department.findOne({
    companyId,
    departmentCode: departmentCode.toUpperCase().trim(),
  });
};

export const findDesignationByCode = async (companyId, designationCode) => {
  if (!designationCode) return null;

  return Designation.findOne({
    companyId,
    designationCode: designationCode.toUpperCase().trim(),
  });
};

export const findShiftById = async (id) => {
  return Shift.findById(id);
};

export const findShiftByCode = async (companyId, shiftCode) => {
  if (!shiftCode) return null;

  return Shift.findOne({
    companyId,
    shiftCode: shiftCode.toUpperCase().trim(),
  });
};

export const findAttendancePolicyById = async (id) => {
  return AttendancePolicy.findById(id);
};

export const findAttendancePolicyByCode = async (companyId, policyCode) => {
  if (!policyCode) return null;

  return AttendancePolicy.findOne({
    companyId,
    policyCode: policyCode.toUpperCase().trim(),
  });
};

export const findLeavePolicyById = async (id) => {
  return LeavePolicy.findById(id);
};

export const findLeavePolicyByCode = async (companyId, policyCode) => {
  if (!policyCode) return null;

  return LeavePolicy.findOne({
    companyId,
    policyCode: policyCode.toUpperCase().trim(),
  });
};

export const findSalaryStructureById = async (id) => {
  return SalaryStructure.findById(id);
};

export const findSalaryStructureByCode = async (companyId, structureCode) => {
  if (!structureCode) return null;

  return SalaryStructure.findOne({
    companyId,
    structureCode: structureCode.toUpperCase().trim(),
  });
};

/* ---------------- Family ---------------- */

export const upsertEmployeeFamily = async (employeeId, payload) => {
  return EmployeeFamily.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeFamily = async (employeeId) => {
  return EmployeeFamily.findOne({ employeeId });
};

/* ---------------- Bank ---------------- */

export const upsertEmployeeBank = async (employeeId, payload) => {
  return EmployeeBank.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeBank = async (employeeId) => {
  return EmployeeBank.findOne({ employeeId });
};

/* ---------------- Statutory ---------------- */

export const upsertEmployeeStatutory = async (employeeId, payload) => {
  return EmployeeStatutory.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeStatutory = async (employeeId) => {
  return EmployeeStatutory.findOne({ employeeId });
};

/* ---------------- Documents ---------------- */

export const upsertEmployeeDocuments = async (employeeId, payload) => {
  return EmployeeDocument.findOneAndUpdate({ employeeId }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
  });
};

export const findEmployeeDocuments = async (employeeId) => {
  return EmployeeDocument.findOne({ employeeId });
};

/* ---------------- Dashboard Helpers ---------------- */

export const countEmployees = async (filter) => {
  return Employee.countDocuments(await withVisibleEmployeeFilter(filter));
};

export const countEmployeesByDepartment = async (companyId) => {
  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true }),
    {
      $group: {
        _id: "$departmentId",
        total: { $sum: 1 },
      },
    },
  ]);
};

export const getUpcomingBirthdays = async (companyId, limit = 10) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true, dateOfBirth: { $ne: null } }),
    {
      $addFields: {
        birthMonth: { $month: "$dateOfBirth" },
        birthDay: { $dayOfMonth: "$dateOfBirth" },
      },
    },
    {
      $match: {
        $or: [
          { birthMonth: { $gt: currentMonth } },
          {
            birthMonth: currentMonth,
            birthDay: { $gte: currentDay },
          },
        ],
      },
    },
    {
      $sort: {
        birthMonth: 1,
        birthDay: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        dateOfBirth: 1,
        birthMonth: 1,
        birthDay: 1,
      },
    },
  ]);
};







