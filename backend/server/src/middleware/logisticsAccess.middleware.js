import { Department } from "../models/Department.js";
import { Employee } from "../models/Employee.js";

import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { ROLES } from "../constants/roles.js";


/* ============================================================
   MANAGEMENT ROLES

   These roles can monitor and manage Logistics for
   their own company.

   - Super Admin
   - Company Admin
   - HR
============================================================ */

const MANAGEMENT_ROLES = new Set(
  [
    ROLES.SUPER_ADMIN,
    ROLES.COMPANY_ADMIN,
    ROLES.HR,
  ].map((role) =>
    String(role || "")
      .trim()
      .toLowerCase()
  )
);


/* ============================================================
   REQUIRE LOGISTICS ACCESS

   Logistics is NOT a separate authentication role.

   Normal employee access is controlled through:

   Employee
        â†“
   Department
        â†“
   featureKey = "logistics"

   Access Rules:

   SUPER ADMIN
      â†’ Logistics allowed

   COMPANY ADMIN
      â†’ Logistics allowed for own company

   HR
      â†’ Logistics allowed for own company

   EMPLOYEE
      â†’ Allowed only when employee belongs to an
        active department whose featureKey = logistics

   OTHER ROLE
      â†’ Access denied
============================================================ */

export const requireLogisticsAccess =
  asyncHandler(
    async (
      req,
      _res,
      next
    ) => {

      /* ========================================================
         AUTHENTICATION CHECK
      ======================================================== */

      if (!req.user) {
        throw new ApiError(
          401,
          "Authentication required"
        );
      }


      /* ========================================================
         NORMALIZE ROLE
      ======================================================== */

      const role =
        String(
          req.user.role || ""
        )
          .trim()
          .toLowerCase();


      /* ========================================================
         MANAGEMENT ACCESS

         Super Admin, Company Admin and HR do not need
         to belong to the Logistics department.

         Company isolation is still handled by
         requireTenant + companyId filters.
      ======================================================== */

      if (
        MANAGEMENT_ROLES.has(
          role
        )
      ) {

        req.logisticsAccess = {
          featureKey:
            "logistics",

          accessType:
            "management",

          role,

          canMonitor:
            true,

          canManage:
            true,

          employeeId:
            null,

          employeeCode:
            null,

          departmentId:
            null,

          departmentCode:
            null,

          departmentName:
            null,
        };


        return next();
      }


      /* ========================================================
         ONLY NORMAL EMPLOYEE CAN CONTINUE BELOW
      ======================================================== */

      const employeeRole =
        String(
          ROLES.EMPLOYEE ||
          "employee"
        )
          .trim()
          .toLowerCase();


      if (
        role !==
        employeeRole
      ) {

        throw new ApiError(
          403,
          "You do not have access to the Logistics module"
        );
      }


      /* ========================================================
         COMPANY CONTEXT
      ======================================================== */

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


      /* ========================================================
         FIND EMPLOYEE

         First preference:
         User.employee relation

         Fallback:
         Employee.userId relation
      ======================================================== */

      let employee =
        null;


      if (
        req.user.employee
      ) {

        employee =
          await Employee
            .findOne({
              _id:
                req.user.employee,

              companyId,
            })
            .select(
              [
                "_id",
                "companyId",
                "employeeCode",
                "departmentId",
                "employeeStatus",
                "status",
                "isActive",
              ].join(" ")
            )
            .lean();
      }


      /* ========================================================
         FALLBACK FOR OLD EMPLOYEE ACCOUNTS
      ======================================================== */

      if (!employee) {

        employee =
          await Employee
            .findOne({
              userId:
                req.user._id,

              companyId,
            })
            .select(
              [
                "_id",
                "companyId",
                "employeeCode",
                "departmentId",
                "employeeStatus",
                "status",
                "isActive",
              ].join(" ")
            )
            .lean();
      }


      /* ========================================================
         EMPLOYEE PROFILE CHECK
      ======================================================== */

      if (!employee) {

        throw new ApiError(
          403,
          "Employee profile not found"
        );
      }


      /* ========================================================
         EMPLOYEE ACTIVE STATUS CHECK
      ======================================================== */

      const employeeStatus =
        String(
          employee.employeeStatus ||
          employee.status ||
          ""
        )
          .trim()
          .toLowerCase();


      if (
        employee.isActive ===
        false
      ) {

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
        ].includes(
          employeeStatus
        )
      ) {

        throw new ApiError(
          403,
          "Employee account is not active"
        );
      }


      /* ========================================================
         DEPARTMENT CHECK
      ======================================================== */

      if (
        !employee.departmentId
      ) {

        throw new ApiError(
          403,
          "Employee is not assigned to a department"
        );
      }


      const department =
        await Department
          .findOne({
            _id:
              employee.departmentId,

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


      /* ========================================================
         DEPARTMENT ACTIVE CHECK
      ======================================================== */

      if (
        department.isActive ===
        false
      ) {

        throw new ApiError(
          403,
          "Employee department is inactive"
        );
      }


      /* ========================================================
         LOGISTICS FEATURE CHECK
      ======================================================== */

      const featureKey =
        String(
          department.featureKey ||
          ""
        )
          .trim()
          .toLowerCase();

      const accessModules = Array.isArray(department.accessModules)
        ? department.accessModules.map((item) => String(item || "").trim().toLowerCase())
        : [];

      if (
        featureKey !==
        "logistics" &&
        !accessModules.includes("logistics")
      ) {

        throw new ApiError(
          403,
          "Logistics access is available only to Logistics department employees"
        );
      }


      /* ========================================================
         LOGISTICS EMPLOYEE ACCESS CONTEXT
      ======================================================== */

      req.logisticsAccess = {

        featureKey:
          "logistics",

        accessType:
          "employee",

        role,

        canMonitor:
          false,

        canManage:
          true,

        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode ||
          null,

        departmentId:
          department._id,

        departmentCode:
          department.departmentCode ||
          null,

        departmentName:
          department.departmentName ||
          "Logistics",
      };


      next();
    }
  );
