import express from "express";

import purchaseRequestRoutes
  from "./purchaseRequest.routes.js";

import vendorEnquiryRoutes
  from "./vendorEnquiry.routes.js";

import purchaseQuotationRoutes
  from "./purchaseQuotation.routes.js";

import purchaseOrderRoutes
  from "./purchaseOrder.routes.js";

import goodsReceiptRoutes
  from "./goodsReceipt.routes.js";

import {
  requireAuth
} from "../middleware/auth.middleware.js";

import {
  requireTenant
} from "../middleware/tenant.middleware.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

import {
  ApiError
} from "../utils/apiError.js";

import {
  ApiResponse
} from "../utils/apiResponse.js";

import {
  Employee
} from "../models/Employee.js";

import LogisticsWarehouse
  from "../models/LogisticsWarehouse.js";

import LogisticsVendor
  from "../models/LogisticsVendor.js";


const router =
  express.Router();


/* ============================================================
   AUTH / TENANT
============================================================ */

router.use(
  requireAuth
);

router.use(
  requireTenant
);


/* ============================================================
   HELPERS
============================================================ */

const companyIdOf =
  (
    user
  ) =>
    user?.companyId?._id ||
    user?.companyId;


const clean =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim();


const normalize =
  (
    value
  ) =>
    clean(
      value
    )
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        ""
      );


const escapeRegex =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );


/* ============================================================
   PURCHASE DEPARTMENT MATCHER
============================================================ */

const isPurchaseDepartment =
  (
    department
  ) => {

    if (
      !department
    ) {

      return false;
    }


    const values = [
      department.departmentName,
      department.departmentCode,
      department.name,
      department.code,
      department.featureKey,
      department.key,
      department.slug
    ];


    return values
      .some(
        (
          value
        ) => {

          const normalized =
            normalize(
              value
            );


          return (
            normalized ===
              "purchase" ||
            normalized ===
              "purchases" ||
            normalized ===
              "purchasing" ||
            normalized ===
              "procurement"
          );

        }
      );
  };


/* ============================================================
   PURCHASE SENIOR
============================================================ */

const isPurchaseSenior =
  (
    employee
  ) => {

    const organizationRole =
      normalize(
        employee?.organizationRole
      );


    return [
      "departmenthead",
      "teamleader"
    ]
      .includes(
        organizationRole
      );
  };


/* ============================================================
   RESOLVE PURCHASE ACCESS

   IMPORTANT:
   - No Company Admin bypass.
   - No HR bypass.
   - User must resolve to Employee.
   - Employee must belong to Purchase Department.
============================================================ */

const resolvePurchaseAccess =
  asyncHandler(
    async (
      req,
      res,
      next
    ) => {

      const companyId =
        companyIdOf(
          req.user
        );


      if (
        !companyId
      ) {

        throw new ApiError(
          403,
          "Company context missing."
        );
      }


      const employeeCode =
        clean(
          req.user?.employeeCode
        )
          .toUpperCase();


      const userId =
        req.user?._id;


      const identityFilters =
        [];


      if (
        userId
      ) {

        identityFilters.push({
          userId
        });
      }


      if (
        employeeCode
      ) {

        identityFilters.push({
          employeeCode
        });
      }


      if (
        !identityFilters.length
      ) {

        throw new ApiError(
          403,
          "Purchase employee context could not be resolved."
        );
      }


      const employee =
        await Employee
          .findOne({
            companyId,

            $or:
              identityFilters
          })
          .populate(
            "departmentId",
            [
              "departmentName",
              "departmentCode",
              "name",
              "code",
              "featureKey",
              "key",
              "slug"
            ]
              .join(
                " "
              )
          )
          .populate(
            "designationId",
            [
              "designationName",
              "designationCode",
              "name",
              "code"
            ]
              .join(
                " "
              )
          )
          .lean();


      if (
        !employee
      ) {

        throw new ApiError(
          403,
          "Purchase access is allowed only for Purchase Department employees."
        );
      }


      if (
        !isPurchaseDepartment(
          employee.departmentId
        )
      ) {

        throw new ApiError(
          403,
          "Purchase access is allowed only for Purchase Department employees."
        );
      }


      req.purchaseAccess = {

        companyId,

        employeeId:
          employee._id,

        employeeCode:
          employee.employeeCode,

        employeeName:
          employee.displayName ||
          [
            employee.firstName,
            employee.lastName
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            ) ||
          employee.employeeCode,

        departmentId:
          employee.departmentId?._id ||
          employee.departmentId,

        departmentName:
          employee.departmentId
            ?.departmentName ||
          employee.departmentId
            ?.name ||
          "Purchase",

        departmentCode:
          employee.departmentId
            ?.departmentCode ||
          employee.departmentId
            ?.code ||
          "",

        organizationRole:
          employee.organizationRole ||
          "",

        designationId:
          employee.designationId?._id ||
          employee.designationId ||
          null,

        designationName:
          employee.designationId
            ?.designationName ||
          employee.designationId
            ?.name ||
          "",

        canApprove:
          isPurchaseSenior(
            employee
          )

      };


      next();
    }
  );


router.use(
  resolvePurchaseAccess
);


/* ============================================================
   PURCHASE ACCESS INFO
============================================================ */

router.get(
  "/access",

  asyncHandler(
    async (
      req,
      res
    ) => {

      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            {
              companyId:
                req.purchaseAccess
                  .companyId,

              employeeId:
                req.purchaseAccess
                  .employeeId,

              employeeCode:
                req.purchaseAccess
                  .employeeCode,

              employeeName:
                req.purchaseAccess
                  .employeeName,

              departmentId:
                req.purchaseAccess
                  .departmentId,

              departmentName:
                req.purchaseAccess
                  .departmentName,

              departmentCode:
                req.purchaseAccess
                  .departmentCode,

              organizationRole:
                req.purchaseAccess
                  .organizationRole,

              designationId:
                req.purchaseAccess
                  .designationId,

              designationName:
                req.purchaseAccess
                  .designationName,

              canApprove:
                req.purchaseAccess
                  .canApprove ===
                true
            },

            "Purchase access resolved successfully."
          )
        );
    }
  )
);


/* ============================================================
   READ-ONLY WAREHOUSE REFERENCE

   Existing LogisticsWarehouse data only.
============================================================ */

router.get(
  "/warehouses",

  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        req.purchaseAccess
          ?.companyId;


      if (
        !companyId
      ) {

        throw new ApiError(
          403,
          "Company context missing."
        );
      }


      const search =
        clean(
          req.query?.search
        );


      const limit =
        Math.min(
          Math.max(
            Number(
              req.query?.limit
            ) ||
            100,
            1
          ),
          100
        );


      const filter = {

        companyId,

        isActive:
          true

      };


      if (
        search
      ) {

        const regex =
          new RegExp(
            escapeRegex(
              search
            ),
            "i"
          );


        filter.$or = [

          {
            warehouseName:
              regex
          },

          {
            warehouseCode:
              regex
          },

          {
            "address.city":
              regex
          },

          {
            "address.state":
              regex
          }

        ];
      }


      const warehouses =
        await LogisticsWarehouse
          .find(
            filter
          )
          .select(
            [
              "_id",
              "warehouseCode",
              "warehouseName",
              "address",
              "status",
              "isActive"
            ]
              .join(
                " "
              )
          )
          .sort({
            warehouseName:
              1
          })
          .limit(
            limit
          )
          .lean();


      const result =
        warehouses
          .map(
            (
              warehouse
            ) => ({

              _id:
                warehouse._id,

              name:
                warehouse.warehouseName,

              code:
                warehouse.warehouseCode,

              address:
                warehouse.address,

              city:
                warehouse.address?.city ||
                "",

              state:
                warehouse.address?.state ||
                "",

              country:
                warehouse.address?.country ||
                "",

              status:
                warehouse.status,

              isActive:
                warehouse.isActive !==
                false

            })
          );


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Purchase warehouses loaded successfully."
          )
        );
    }
  )
);


/* ============================================================
   READ-ONLY VENDOR REFERENCE

   IMPORTANT:
   - Reuses LogisticsVendor.
   - No duplicate Purchase Vendor collection.
   - No create route.
   - No update route.
   - No delete route.
   - Company scoped.
   - Active vendors only.
============================================================ */

router.get(
  "/vendors",

  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        req.purchaseAccess
          ?.companyId;


      if (
        !companyId
      ) {

        throw new ApiError(
          403,
          "Company context missing."
        );
      }


      const search =
        clean(
          req.query?.search
        );


      const limit =
        Math.min(
          Math.max(
            Number(
              req.query?.limit
            ) ||
            200,
            1
          ),
          500
        );


      const filter = {

        companyId,

        isActive:
          true

      };


      if (
        search
      ) {

        const regex =
          new RegExp(
            escapeRegex(
              search
            ),
            "i"
          );


        filter.$or = [

          {
            vendorName:
              regex
          },

          {
            vendorCode:
              regex
          },

          {
            companyName:
              regex
          },

          {
            contactPerson:
              regex
          },

          {
            mobile:
              regex
          },

          {
            email:
              regex
          },

          {
            gstNumber:
              regex
          }

        ];
      }


      const vendors =
        await LogisticsVendor
          .find(
            filter
          )
          .select(
            [
              "_id",
              "vendorCode",
              "vendorName",
              "companyName",
              "contactPerson",
              "mobile",
              "email",
              "gstNumber",
              "paymentTerms",
              "currency",
              "status",
              "isActive"
            ]
              .join(
                " "
              )
          )
          .sort({
            vendorName:
              1,

            companyName:
              1
          })
          .limit(
            limit
          )
          .lean();


      const result =
        vendors
          .map(
            (
              vendor
            ) => ({

              _id:
                vendor._id,

              vendorCode:
                vendor.vendorCode ||
                "",

              vendorName:
                vendor.vendorName ||
                vendor.companyName ||
                "Vendor",

              companyName:
                vendor.companyName ||
                "",

              contactPerson:
                vendor.contactPerson ||
                "",

              mobile:
                vendor.mobile ||
                "",

              email:
                vendor.email ||
                "",

              gstNumber:
                vendor.gstNumber ||
                "",

              paymentTerms:
                vendor.paymentTerms ||
                "",

              currency:
                vendor.currency ||
                "INR",

              status:
                vendor.status ||
                "active",

              isActive:
                vendor.isActive !==
                false

            })
          );


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Purchase vendors loaded successfully."
          )
        );
    }
  )
);


/* ============================================================
   PURCHASE REQUESTS
============================================================ */

router.use(
  "/requests",
  purchaseRequestRoutes
);


/* ============================================================
   VENDOR ENQUIRIES / RFQ
============================================================ */

router.use(
  "/vendor-enquiries",
  vendorEnquiryRoutes
);


/* ============================================================
   PURCHASE QUOTATIONS
============================================================ */

router.use(
  "/quotations",
  purchaseQuotationRoutes
);


/* ============================================================
   PURCHASE ORDERS
============================================================ */

router.use(
  "/purchase-orders",
  purchaseOrderRoutes
);


/* ============================================================
   GOODS RECEIPTS / GRN
============================================================ */

router.use(
  "/goods-receipts",
  goodsReceiptRoutes
);


export default router;