import { Department }
  from "../models/Department.js";

import {
  Employee,
  ORGANIZATION_ROLE,
} from "../models/Employee.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

import { ROLES }
  from "../constants/roles.js";

const MANAGEMENT_ROLES = new Set(
  [
    ROLES.SUPER_ADMIN,
    ROLES.COMPANY_ADMIN,
  ].map((role) =>
    String(role || "")
      .trim()
      .toLowerCase()
  )
);

const WAREHOUSE_FEATURE_KEYS =
  new Set([
    "warehouse",
    "store",
  ]);

const WAREHOUSE_ACCESS_MODULES =
  new Set([
    "warehouse",
    "store",
    "inventory",
  ]);

export const requireWarehouseAccess =
  asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new ApiError(
        401,
        "Authentication required"
      );
    }

    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    if (MANAGEMENT_ROLES.has(role)) {
      req.warehouseAccess = {
        featureKey: "warehouse",
        accessType: "management",
        role,
        organizationRole: null,
        canMonitor: true,
        canManage: true,
        employeeId: null,
        employeeCode: null,
        departmentId: null,
        departmentCode: null,
        departmentName: null,
      };

      return next();
    }

    const employeeRole = String(
      ROLES.EMPLOYEE || "employee"
    )
      .trim()
      .toLowerCase();

    if (role !== employeeRole) {
      throw new ApiError(
        403,
        "You do not have access to the Warehouse module"
      );
    }

    const companyId =
      req.auth?.companyId ||
      req.user.companyId?._id ||
      req.user.companyId;

    if (!companyId) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    let employee = null;

    if (req.user.employee) {
      employee = await Employee.findOne({
        _id: req.user.employee,
        companyId,
      })
        .select(
          [
            "_id",
            "companyId",
            "employeeCode",
            "departmentId",
            "organizationRole",
            "employeeStatus",
            "isActive",
          ].join(" ")
        )
        .lean();
    }

    if (!employee) {
      employee = await Employee.findOne({
        userId: req.user._id,
        companyId,
      })
        .select(
          [
            "_id",
            "companyId",
            "employeeCode",
            "departmentId",
            "organizationRole",
            "employeeStatus",
            "isActive",
          ].join(" ")
        )
        .lean();
    }

    if (!employee) {
      throw new ApiError(
        403,
        "Employee profile not found"
      );
    }

    const employeeStatus = String(
      employee.employeeStatus || ""
    )
      .trim()
      .toLowerCase();

    if (employee.isActive === false) {
      throw new ApiError(
        403,
        "Employee account is inactive"
      );
    }

    if (
      [
        "inactive",
        "blocked",
        "terminated",
        "suspended",
      ].includes(employeeStatus)
    ) {
      throw new ApiError(
        403,
        "Employee account is not active"
      );
    }

    if (!employee.departmentId) {
      throw new ApiError(
        403,
        "Employee is not assigned to a department"
      );
    }

    const department =
      await Department.findOne({
        _id: employee.departmentId,
        companyId,
      })
        .select(
          [
            "_id",
            "departmentName",
            "departmentCode",
            "featureKey",
            "dashboardKey",
            "accessModules",
            "isActive",
          ].join(" ")
        )
        .lean();

    if (!department) {
      throw new ApiError(
        403,
        "Employee department not found"
      );
    }

    if (department.isActive === false) {
      throw new ApiError(
        403,
        "Employee department is inactive"
      );
    }

    const featureKey = String(
      department.featureKey || ""
    )
      .trim()
      .toLowerCase();

    const dashboardKey = String(
      department.dashboardKey || ""
    )
      .trim()
      .toLowerCase();

    const accessModules = Array.isArray(
      department.accessModules
    )
      ? department.accessModules.map((item) =>
          String(item || "")
            .trim()
            .toLowerCase()
        )
      : [];

    const isWarehouseDepartment =
      WAREHOUSE_FEATURE_KEYS.has(featureKey) ||
      dashboardKey === "warehouse" ||
      accessModules.some((item) =>
        WAREHOUSE_ACCESS_MODULES.has(item)
      );

    if (!isWarehouseDepartment) {
      throw new ApiError(
        403,
        "Warehouse access is available only to Warehouse department employees"
      );
    }

    const organizationRole = String(
      employee.organizationRole ||
        ORGANIZATION_ROLE.EMPLOYEE
    )
      .trim()
      .toLowerCase();

    req.warehouseAccess = {
      featureKey: "warehouse",
      accessType: "employee",
      role,
      organizationRole,
      canMonitor: false,
      canManage: true,
      employeeId: employee._id,
      employeeCode: employee.employeeCode || null,
      departmentId: department._id,
      departmentCode:
        department.departmentCode || null,
      departmentName:
        department.departmentName || "Warehouse",
    };

    next();
  });