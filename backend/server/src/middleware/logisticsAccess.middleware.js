import { Department } from "../models/Department.js";

import {
  Employee,
  ORGANIZATION_ROLE,
} from "../models/Employee.js";

import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { ROLES } from "../constants/roles.js";


/* ============================================================
   MANAGEMENT ROLES

   These roles can monitor and manage Logistics for
   their own company.

   Important:
   General Logistics management access does NOT automatically
   grant Vendor Payment -> Accounts handoff authority.
============================================================ */

const MANAGEMENT_ROLES =
  new Set(
    [
      ROLES.SUPER_ADMIN,
      ROLES.COMPANY_ADMIN,
      ROLES.HR,
    ]
      .map(
        (
          role
        ) =>
          String(
            role ||
            ""
          )
            .trim()
            .toLowerCase()
      )
  );


/* ============================================================
   LOGISTICS SENIOR ORGANIZATION ROLES

   Accounts handoff is a senior-level Logistics action.

   Existing Employee.organizationRole values are reused.

   No:
   - New DB field
   - Migration
   - Seed
   - Permission reset
============================================================ */

const LOGISTICS_HANDOFF_ROLES =
  new Set(
    [
      ORGANIZATION_ROLE
        .DEPARTMENT_HEAD,

      ORGANIZATION_ROLE
        .TEAM_LEADER,
    ]
      .map(
        (
          role
        ) =>
          String(
            role ||
            ""
          )
            .trim()
            .toLowerCase()
      )
  );


/* ============================================================
   REQUIRE LOGISTICS ACCESS

   Logistics is NOT a separate authentication role.

   Normal employee access is controlled through:

   Employee
        ↓
   Department
        ↓
   featureKey = "logistics"

   Access Rules:

   SUPER ADMIN
      → Logistics allowed

   COMPANY ADMIN
      → Logistics allowed for own company

   HR
      → Logistics allowed for own company

   EMPLOYEE
      → Allowed only when employee belongs to an
        active department whose featureKey = logistics

   OTHER ROLE
      → Access denied

   Accounts Handoff:

   department_head
      → allowed

   team_leader
      → allowed

   normal employee
      → not allowed

   custom role
      → not automatically allowed
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

      if (
        !req.user
      ) {

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
          req.user.role ||
          ""
        )
          .trim()
          .toLowerCase();


      /* ========================================================
         MANAGEMENT ACCESS

         Super Admin, Company Admin and HR do not need
         to belong to the Logistics department.

         Company isolation is still handled by
         requireTenant + companyId filters.

         IMPORTANT:
         Management access by itself does NOT allow
         Vendor Payment -> Accounts handoff.
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

          organizationRole:
            null,

          canMonitor:
            true,

          canManage:
            true,

          /*
           * Explicitly false.
           *
           * Accounts handoff belongs to a Logistics
           * Department Head / Team Leader workflow.
           */
          canHandoffToAccounts:
            false,

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


      if (
        !companyId
      ) {

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

         organizationRole is included because it controls
         senior-level Logistics -> Accounts handoff.
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
                "organizationRole",
                "employeeStatus",
                "status",
                "isActive",
              ]
                .join(
                  " "
                )
            )
            .lean();
      }


      /* ========================================================
         FALLBACK FOR OLD EMPLOYEE ACCOUNTS
      ======================================================== */

      if (
        !employee
      ) {

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
                "organizationRole",
                "employeeStatus",
                "status",
                "isActive",
              ]
                .join(
                  " "
                )
            )
            .lean();
      }


      /* ========================================================
         EMPLOYEE PROFILE CHECK
      ======================================================== */

      if (
        !employee
      ) {

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
        ]
          .includes(
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
            ]
              .join(
                " "
              )
          )
          .lean();


      if (
        !department
      ) {

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


      const accessModules =
        Array.isArray(
          department.accessModules
        )
          ? department
              .accessModules
              .map(
                (
                  item
                ) =>
                  String(
                    item ||
                    ""
                  )
                    .trim()
                    .toLowerCase()
              )
          : [];


      if (
        featureKey !==
          "logistics" &&
        !accessModules
          .includes(
            "logistics"
          )
      ) {

        throw new ApiError(
          403,
          "Logistics access is available only to Logistics department employees"
        );
      }


      /* ========================================================
         ORGANIZATION ROLE

         Existing Employee hierarchy is reused.

         Senior:
         - department_head
         - team_leader

         Normal employee:
         - employee

         Custom:
         - not automatically considered senior
      ======================================================== */

      const organizationRole =
        String(
          employee.organizationRole ||
          ORGANIZATION_ROLE
            .EMPLOYEE
        )
          .trim()
          .toLowerCase();


      const canHandoffToAccounts =
        LOGISTICS_HANDOFF_ROLES
          .has(
            organizationRole
          );


      /* ========================================================
         LOGISTICS EMPLOYEE ACCESS CONTEXT
      ======================================================== */

      req.logisticsAccess = {

        featureKey:
          "logistics",

        /*
         * Keep existing accessType unchanged.
         *
         * This is intentionally still "employee" so existing
         * Logistics permission resolution continues working.
         */
        accessType:
          "employee",

        role,

        organizationRole,

        canMonitor:
          false,

        canManage:
          true,

        /*
         * Dedicated senior-level Accounts handoff permission.
         */
        canHandoffToAccounts,

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