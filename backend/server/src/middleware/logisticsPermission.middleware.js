import { Employee } from "../models/Employee.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import {
  LOGISTICS_PERMISSIONS,
  LOGISTICS_SUBMODULES,
} from "../constants/logisticsPermissions.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export { LOGISTICS_SUBMODULES };

const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "updateStatus",
  "export",
];


/* ============================================================
   EMPLOYEE LOGISTICS ACCESS
============================================================ */

/*
 * Logistics Employee ko in sab modules ka access milega.
 */
const EMPLOYEE_SUBMODULES = new Set([
  "airCargo",
  "seaFreight",
  "cha",
  "transporters",
  "warehouse",
  "tracking",
  "documents",
]);


/*
 * Operational modules:
 *
 * Employee:
 * - view
 * - create
 * - updateStatus
 *
 * kar sakta hai.
 */
const EMPLOYEE_OPERATIONAL_SUBMODULES = new Set([
  "airCargo",
  "seaFreight",
  "cha",
  "transporters",
  "warehouse",
]);


/* ============================================================
   PERMISSION BUILDER
============================================================ */

export const buildLogisticsPermission = ({
  subModule,
  viewScope = "own",
  allowed = {},
}) => ({
  module: "logistics",
  subModule,

  view: Boolean(allowed.view),
  viewScope,

  create: Boolean(allowed.create),
  edit: Boolean(allowed.edit),
  delete: Boolean(allowed.delete),

  updateStatus: Boolean(
    allowed.updateStatus
  ),

  export: Boolean(
    allowed.export
  ),
});


/* ============================================================
   DEFAULT PERMISSION SETS
============================================================ */

const fullAccess = Object.freeze({
  view: true,
  create: true,
  edit: true,
  delete: true,
  updateStatus: true,
  export: true,
});


const viewOnly = Object.freeze({
  view: true,
  create: false,
  edit: false,
  delete: false,
  updateStatus: false,
  export: false,
});


const ownStatusOnly = Object.freeze({
  view: true,
  create: false,
  edit: false,
  delete: false,
  updateStatus: true,
  export: false,
});


const ownShipmentCreator = Object.freeze({
  view: true,
  create: true,
  edit: false,
  delete: false,
  updateStatus: true,
  export: false,
});


/* ============================================================
   STRING PERMISSIONS
============================================================ */

const STRING_PERMISSION_MODULES =
  Object.freeze({

    airCargo: {

      read:
        LOGISTICS_PERMISSIONS
          .AIR_CARGO_READ,

      create:
        LOGISTICS_PERMISSIONS
          .AIR_CARGO_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .AIR_CARGO_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .AIR_CARGO_DELETE,
    },


    seaFreight: {

      read:
        LOGISTICS_PERMISSIONS
          .SEA_FREIGHT_READ,

      create:
        LOGISTICS_PERMISSIONS
          .SEA_FREIGHT_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .SEA_FREIGHT_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .SEA_FREIGHT_DELETE,
    },


    cha: {

      read:
        LOGISTICS_PERMISSIONS
          .CHA_READ,

      create:
        LOGISTICS_PERMISSIONS
          .CHA_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .CHA_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .CHA_DELETE,
    },


    transporters: {

      read:
        LOGISTICS_PERMISSIONS
          .TRANSPORTER_READ,

      create:
        LOGISTICS_PERMISSIONS
          .TRANSPORTER_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .TRANSPORTER_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .TRANSPORTER_DELETE,
    },


    warehouse: {

      read:
        LOGISTICS_PERMISSIONS
          .WAREHOUSE_READ,

      create:
        LOGISTICS_PERMISSIONS
          .WAREHOUSE_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .WAREHOUSE_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .WAREHOUSE_DELETE,
    },


    tracking: {

      read:
        LOGISTICS_PERMISSIONS
          .TRACKING_READ,

      create:
        LOGISTICS_PERMISSIONS
          .TRACKING_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .TRACKING_UPDATE,
    },


    documents: {

      read:
        LOGISTICS_PERMISSIONS
          .DOCUMENT_READ,

      create:
        LOGISTICS_PERMISSIONS
          .DOCUMENT_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .DOCUMENT_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .DOCUMENT_DELETE,
    },
    customers: {
      read:
        LOGISTICS_PERMISSIONS
          .CUSTOMER_READ,

      create:
        LOGISTICS_PERMISSIONS
          .CUSTOMER_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .CUSTOMER_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .CUSTOMER_DELETE,
    },


    vendors: {
      read:
        LOGISTICS_PERMISSIONS
          .VENDOR_READ,

      create:
        LOGISTICS_PERMISSIONS
          .VENDOR_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .VENDOR_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .VENDOR_DELETE,
    },


    productsServices: {
      read:
        LOGISTICS_PERMISSIONS
          .PRODUCT_SERVICE_READ,

      create:
        LOGISTICS_PERMISSIONS
          .PRODUCT_SERVICE_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .PRODUCT_SERVICE_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .PRODUCT_SERVICE_DELETE,
    },


    vendorPayments: {
      read:
        LOGISTICS_PERMISSIONS
          .VENDOR_PAYMENT_READ,

      create:
        LOGISTICS_PERMISSIONS
          .VENDOR_PAYMENT_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .VENDOR_PAYMENT_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .VENDOR_PAYMENT_DELETE,
    },


    invoices: {
      read:
        LOGISTICS_PERMISSIONS
          .INVOICE_READ,

      create:
        LOGISTICS_PERMISSIONS
          .INVOICE_CREATE,

      update:
        LOGISTICS_PERMISSIONS
          .INVOICE_UPDATE,

      delete:
        LOGISTICS_PERMISSIONS
          .INVOICE_DELETE,
    },


    reports: {
      read:
        LOGISTICS_PERMISSIONS
          .REPORT_READ,

      export:
        LOGISTICS_PERMISSIONS
          .REPORT_EXPORT,
    },
  });


/* ============================================================
   MERGE PERMISSIONS
============================================================ */

const mergePermissionSets = (
  ...sets
) => {

  const merged =
    new Map();


  sets
    .flat()
    .filter(Boolean)
    .forEach(
      (
        permission
      ) => {

        const current =
          merged.get(
            permission.subModule
          );


        if (!current) {

          merged.set(
            permission.subModule,
            {
              ...permission,
            }
          );

          return;
        }


        current.view =
          current.view ||
          permission.view;


        current.create =
          current.create ||
          permission.create;


        current.edit =
          current.edit ||
          permission.edit;


        current.delete =
          current.delete ||
          permission.delete;


        current.updateStatus =
          current.updateStatus ||
          permission.updateStatus;

        current.export =
          current.export ||
          permission.export;


        current.viewScope =
          widerScope(
            current.viewScope,
            permission.viewScope
          );
      }
    );


  return Array.from(
    merged.values()
  );
};


/* ============================================================
   STRING -> STRUCTURED PERMISSIONS
============================================================ */

const structuredPermissionsFromStrings =
  (
    req
  ) => {

    const values = [

      ...(
        Array.isArray(
          req.auth?.permissions
        )
          ? req.auth.permissions
          : []
      ),

      ...(
        Array.isArray(
          req.user?.roleRef?.permissions
        )
          ? req.user.roleRef.permissions
          : []
      ),

      ...(
        Array.isArray(
          req.user?.permissions
        )
          ? req.user.permissions
          : []
      ),

    ].filter(
      (
        permission
      ) =>
        typeof permission ===
        "string"
    );


    const assigned =
      new Set(
        values
      );


    const role =
      normalize(
        req.user?.role
      );


    const accessType =
      normalize(
        req.logisticsAccess
          ?.accessType
      );


    const viewScope =

      role ===
        ROLES.SUPER_ADMIN ||

        role ===
        ROLES.COMPANY_ADMIN ||

        role ===
        ROLES.HR

        ? "all"

        : accessType ===
          "manager"

          ? "team"

          : "own";


    return Object
      .entries(
        STRING_PERMISSION_MODULES
      )
      .map(
        (
          [
            subModule,
            permissions,
          ]
        ) => {

          const view =
            assigned.has(
              permissions.read
            );


          const create =
            assigned.has(
              permissions.create
            );


          const edit =
            assigned.has(
              permissions.update
            );


          const canDelete =
            assigned.has(
              permissions.delete
            );

          const canExport =
            assigned.has(
              permissions.export
            );


          if (
            !view &&
            !create &&
            !edit &&
            !canDelete &&
            !canExport
          ) {
            return null;
          }

          return buildLogisticsPermission(
            {

              subModule,

              viewScope,

              allowed: {

                view:
                  view ||
                  create ||
                  edit ||
                  canDelete ||
                  canExport,

                create,

                edit,

                delete:
                  canDelete,

                updateStatus:
                  edit,

                export:
                  canExport,
              },
            }
          );
        }
      )
      .filter(
        Boolean
      );
  };


/* ============================================================
   VIEW SCOPE
============================================================ */

const widerScope = (
  left = "own",
  right = "own"
) => {

  const rank = {

    own: 1,

    team: 2,

    all: 3,
  };


  return (
    rank[right] ||
    1
  ) >
    (
      rank[left] ||
      1
    )

    ? right

    : left;
};


/* ============================================================
   DEFAULT ROLE PERMISSIONS
============================================================ */

export const defaultLogisticsPermissionsForRole =
  (
    role,
    accessType = ""
  ) => {

    const normalizedRole =
      normalize(
        role
      );


    /* --------------------------------------------------------
       SUPER ADMIN / COMPANY ADMIN
    -------------------------------------------------------- */

    if (
      normalizedRole ===
      ROLES.SUPER_ADMIN ||

      normalizedRole ===
      ROLES.COMPANY_ADMIN
    ) {

      return LOGISTICS_SUBMODULES
        .map(
          (
            subModule
          ) =>
            buildLogisticsPermission(
              {

                subModule,

                viewScope:
                  "all",

                allowed:
                  fullAccess,
              }
            )
        );
    }


    /* --------------------------------------------------------
       HR
    -------------------------------------------------------- */

    if (
      normalizedRole ===
      ROLES.HR
    ) {

      return LOGISTICS_SUBMODULES
        .map(
          (
            subModule
          ) =>
            buildLogisticsPermission(
              {

                subModule,

                viewScope:
                  "all",

                allowed:
                  viewOnly,
              }
            )
        );
    }


    /* --------------------------------------------------------
       MANAGER / TEAM LEADER
    -------------------------------------------------------- */

    if (
      normalizedRole ===
      "manager" ||

      normalizedRole ===
      "team_leader"
    ) {

      return LOGISTICS_SUBMODULES
        .map(
          (
            subModule
          ) =>
            buildLogisticsPermission(
              {

                subModule,

                viewScope:
                  "team",

                allowed:
                  fullAccess,
              }
            )
        );
    }


    /* --------------------------------------------------------
       LOGISTICS EMPLOYEE
    -------------------------------------------------------- */

    if (
      accessType ===
      "employee" ||

      normalizedRole ===
      ROLES.EMPLOYEE
    ) {

      return LOGISTICS_SUBMODULES
        .map(
          (
            subModule
          ) => {

            /*
             * Air Cargo
             * Sea Freight
             * CHA
             * Transporters
             * Warehouse
             *
             * Employee ko:
             * view + create + updateStatus
             */
            if (
              EMPLOYEE_OPERATIONAL_SUBMODULES
                .has(
                  subModule
                )
            ) {

              return buildLogisticsPermission(
                {

                  subModule,

                  viewScope:
                    "own",

                  allowed:
                    ownShipmentCreator,
                }
              );
            }


            /*
             * Tracking + Documents
             */
            if (
              EMPLOYEE_SUBMODULES
                .has(
                  subModule
                )
            ) {

              return buildLogisticsPermission(
                {

                  subModule,

                  viewScope:
                    "own",

                  allowed:
                    ownStatusOnly,
                }
              );
            }


            return buildLogisticsPermission(
              {

                subModule,

                viewScope:
                  "own",

                allowed: {},
              }
            );
          }
        );
    }


    return [];
  };


/* ============================================================
   RESOLVE LOGISTICS PERMISSIONS
============================================================ */

export const resolveLogisticsPermissions =
  (
    req
  ) => {

    const structured = [

      ...(
        Array.isArray(
          req.auth
            ?.structuredPermissions
        )
          ? req.auth
            .structuredPermissions
          : []
      ),

      ...(
        Array.isArray(
          req.user
            ?.roleRef
            ?.permissions
        )
          ? req.user
            .roleRef
            .permissions
          : []
      ),

      ...(
        Array.isArray(
          req.user
            ?.permissions
        )
          ? req.user
            .permissions
          : []
      ),

    ].filter(
      (
        permission
      ) =>
        permission &&
        typeof permission ===
        "object" &&
        permission.module ===
        "logistics"
    );


    const stringPermissions =
      structuredPermissionsFromStrings(
        req
      );


    const permissions =
      structured.length

        ? mergePermissionSets(

          structured
            .map(
              normalizePermission
            )
            .filter(
              Boolean
            ),

          stringPermissions
        )

        : mergePermissionSets(

          defaultLogisticsPermissionsForRole(
            req.user?.role,
            req.logisticsAccess
              ?.accessType
          ),

          stringPermissions
        );


    /* ========================================================
       IMPORTANT FIX:
       EMPLOYEE CORE LOGISTICS ACCESS
    ======================================================== */

    if (
      req.logisticsAccess
        ?.accessType ===
      "employee" ||

      normalize(
        req.user?.role
      ) ===
      ROLES.EMPLOYEE
    ) {

      const employeePermissions =
        permissions.map(
          (
            permission
          ) => {

            /*
             * Force operational modules available
             * even if old DB permissions exist.
             */
            if (
              EMPLOYEE_OPERATIONAL_SUBMODULES
                .has(
                  permission.subModule
                )
            ) {

              return {

                ...permission,

                view:
                  true,

                viewScope:
                  "own",

                create:
                  true,

                updateStatus:
                  true,
              };
            }


            return permission;
          }
        );


      /*
       * Agar old database permission list me
       * CHA / Transporter / Warehouse entry hi
       * nahi hai, to entry create kar denge.
       */
      for (
        const subModule of
        EMPLOYEE_OPERATIONAL_SUBMODULES
      ) {

        const existing =
          employeePermissions
            .find(
              (
                permission
              ) =>
                permission
                  .subModule ===
                subModule
            );


        if (!existing) {

          employeePermissions
            .push(
              buildLogisticsPermission(
                {

                  subModule,

                  viewScope:
                    "own",

                  allowed:
                    ownShipmentCreator,
                }
              )
            );

          continue;
        }


        existing.view =
          true;


        existing.viewScope =
          "own";


        existing.create =
          true;


        existing.updateStatus =
          true;
      }


      return employeePermissions;
    }


    return permissions;
  };


/* ============================================================
   GET SINGLE PERMISSION
============================================================ */

export const getLogisticsPermission =
  (
    req,
    subModule = "airCargo"
  ) => {

    const permissions =
      resolveLogisticsPermissions(
        req
      );


    return (
      permissions.find(
        (
          permission
        ) =>
          permission.subModule ===
          subModule
      ) ||
      null
    );
  };


/* ============================================================
   REQUIRE LOGISTICS PERMISSION
============================================================ */

export const requireLogisticsPermission =
  (
    action = "view",
    subModule = "airCargo"
  ) =>
    asyncHandler(
      async (
        req,
        _res,
        next
      ) => {

        const permission =
          getLogisticsPermission(
            req,
            subModule
          );


        if (
          !permission?.[
          action
          ]
        ) {

          throw new ApiError(
            403,
            "Permission denied for Logistics module"
          );
        }


        req.logisticsPermission =
          permission;


        req.logisticsPermissions =
          resolveLogisticsPermissions(
            req
          );


        req.logisticsScope =
          await resolveLogisticsScope(
            req,
            permission.viewScope
          );


        next();
      }
    );


/* ============================================================
   ATTACH LOGISTICS SCOPE
============================================================ */

export const attachLogisticsScope =
  (
    subModule = "airCargo"
  ) =>
    asyncHandler(
      async (
        req,
        _res,
        next
      ) => {

        const permission =
          getLogisticsPermission(
            req,
            subModule
          );


        if (
          !permission?.view
        ) {

          throw new ApiError(
            403,
            "Permission denied for Logistics module"
          );
        }


        req.logisticsPermission =
          permission;


        req.logisticsPermissions =
          resolveLogisticsPermissions(
            req
          );


        req.logisticsScope =
          await resolveLogisticsScope(
            req,
            permission.viewScope
          );


        next();
      }
    );


/* ============================================================
   RESOLVE LOGISTICS SCOPE
============================================================ */

export const resolveLogisticsScope =
  async (
    req,
    viewScope = "own"
  ) => {

    const scope =
      [
        "own",
        "team",
        "all",
      ].includes(
        viewScope
      )

        ? viewScope

        : "own";


    /* --------------------------------------------------------
       ALL
    -------------------------------------------------------- */

    if (
      scope ===
      "all"
    ) {

      return {

        viewScope:
          "all",

        filter: {},

        employeeIds: [],
      };
    }


    const companyId =

      req.auth?.companyId ||

      req.user
        ?.companyId
        ?._id ||

      req.user
        ?.companyId;


    const ownEmployeeId =

      req.logisticsAccess
        ?.employeeId ||

      req.user
        ?.employee ||

      null;


    /* --------------------------------------------------------
       OWN
    -------------------------------------------------------- */

    if (
      scope ===
      "own"
    ) {

      const employeeId =

        ownEmployeeId ||

        (
          await employeeIdForUser(
            req.user?._id,
            companyId
          )
        );


      return {

        viewScope:
          "own",

        employeeIds:
          employeeId
            ? [
              String(
                employeeId
              ),
            ]
            : [],


        filter:
          employeeId

            ? {

              $or: [

                {
                  assignedTo:
                    employeeId,
                },

                {
                  createdByEmployeeId:
                    employeeId,
                },
              ],
            }

            : {

              assignedTo: {
                $in: [],
              },
            },
      };
    }


    /* --------------------------------------------------------
       TEAM
    -------------------------------------------------------- */

    const reportees =
      await User
        .find(
          {

            reportingTo:
              req.user?._id,

            companyId,
          }
        )
        .select(
          "_id employee"
        )
        .lean();


    const userIds =
      reportees
        .map(
          (
            user
          ) =>
            user._id
        )
        .filter(
          Boolean
        );


    const employeeIds =
      reportees
        .map(
          (
            user
          ) =>
            user.employee
        )
        .filter(
          Boolean
        );


    if (
      userIds.length
    ) {

      const employees =
        await Employee
          .find(
            {

              userId: {
                $in:
                  userIds,
              },

              companyId,
            }
          )
          .select(
            "_id"
          )
          .lean();


      employees.forEach(
        (
          employee
        ) =>
          employeeIds
            .push(
              employee._id
            )
      );
    }


    const uniqueEmployeeIds =
      Array.from(
        new Set(
          employeeIds
            .map(
              (
                id
              ) =>
                String(
                  id
                )
            )
        )
      );


    return {

      viewScope:
        "team",

      employeeIds:
        uniqueEmployeeIds,

      filter: {

        $or: [

          {
            assignedTo: {
              $in:
                uniqueEmployeeIds,
            },
          },

          {
            createdByEmployeeId: {
              $in:
                uniqueEmployeeIds,
            },
          },
        ],
      },
    };
  };


/* ============================================================
   EMPLOYEE ID FOR USER
============================================================ */

async function employeeIdForUser(
  userId,
  companyId
) {

  if (
    !userId ||
    !companyId
  ) {

    return null;
  }


  const employee =
    await Employee
      .findOne(
        {
          userId,
          companyId,
        }
      )
      .select(
        "_id"
      )
      .lean();


  return (
    employee?._id ||
    null
  );
}


/* ============================================================
   NORMALIZE STRUCTURED PERMISSION
============================================================ */

function normalizePermission(
  permission
) {

  if (
    !permission ||
    permission.module !==
    "logistics"
  ) {

    return null;
  }


  const subModule =
    normalizeSubModule(
      permission.subModule
    );


  if (
    !subModule
  ) {

    return null;
  }


  return {

    module:
      "logistics",

    subModule,

    viewScope:
      [
        "own",
        "team",
        "all",
      ].includes(
        permission.viewScope
      )

        ? permission.viewScope

        : "own",

    ...Object.fromEntries(

      ACTIONS.map(
        (
          action
        ) => [

            action,

            Boolean(
              permission[
              action
              ]
            ),
          ]
      )
    ),
  };
}


/* ============================================================
   NORMALIZE SUBMODULE
============================================================ */

function normalizeSubModule(
  value
) {

  const key =
    String(
      value ||
      ""
    )
      .trim()
      .replace(
        /[-_\s]+(.)/g,
        (
          _match,
          char
        ) =>
          char.toUpperCase()
      );


  const lower =
    key.toLowerCase();


  const map = {

    aircargo:
      "airCargo",

    seafreight:
      "seaFreight",

    cha:
      "cha",

    transporters:
      "transporters",

    warehouse:
      "warehouse",

    tracking:
      "tracking",

    documents:
      "documents",

    customers:
      "customers",

    vendors:
      "vendors",

    productsservices:
      "productsServices",

    vendorpayments:
      "vendorPayments",

    invoices:
      "invoices",

    reports:
      "reports",
  };


  return (
    map[lower] ||
    null
  );
}


/* ============================================================
   NORMALIZE VALUE
============================================================ */

function normalize(
  value
) {

  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase();
}