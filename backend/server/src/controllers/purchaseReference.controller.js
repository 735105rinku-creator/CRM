import {
    LogisticsWarehouse,
  } from "../models/LogisticsWarehouse.js";
  
  import {
    ApiResponse,
  } from "../utils/apiResponse.js";
  
  import {
    ApiError,
  } from "../utils/apiError.js";
  
  import {
    asyncHandler,
  } from "../utils/asyncHandler.js";
  
  
  /* ============================================================
     HELPERS
  ============================================================ */
  
  const companyIdForRequest =
    (req) => {
  
      const companyId =
        req.purchaseAccess
          ?.companyId;
  
      if (!companyId) {
  
        throw new ApiError(
          403,
          "Purchase company context missing."
        );
      }
  
      return companyId;
    };
  
  
  const cleanText =
    (value) =>
      String(
        value ||
        ""
      )
        .trim();
  
  
  const escapeRegex =
    (value) =>
      cleanText(
        value
      )
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
  
  
  /* ============================================================
     LIST ACTIVE WAREHOUSES
     READ ONLY
  
     Existing LogisticsWarehouse collection is reused.
     Purchase gets no create/update/delete permission here.
  ============================================================ */
  
  export const listPurchaseWarehouses =
    asyncHandler(
      async (
        req,
        res
      ) => {
  
        const companyId =
          companyIdForRequest(
            req
          );
  
  
        const search =
          cleanText(
            req.query
              ?.search
          );
  
  
        const limit =
          Math.min(
            Math.max(
              Number(
                req.query
                  ?.limit
              ) ||
                100,
              1
            ),
            100
          );
  
  
        const filter = {
  
          companyId,
  
          isActive:
            true,
  
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
              warehouseCode:
                regex,
            },
  
            {
              warehouseName:
                regex,
            },
  
            {
              "address.city":
                regex,
            },
  
            {
              "address.state":
                regex,
            },
  
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
                "isActive",
              ]
                .join(
                  " "
                )
            )
            .sort({
              warehouseName:
                1,
            })
            .limit(
              limit
            )
            .lean();
  
  
        /*
         * Convert the existing LogisticsWarehouse
         * shape into a small Purchase dropdown shape.
         *
         * Mongo IDs remain internal values only.
         * UI will display warehouse name/code.
         */
  
        const rows =
          warehouses
            .map(
              (
                warehouse
              ) => ({
  
                _id:
                  String(
                    warehouse._id
                  ),
  
                name:
                  warehouse
                    .warehouseName ||
                  warehouse
                    .warehouseCode ||
                  "Warehouse",
  
                code:
                  warehouse
                    .warehouseCode ||
                  "",
  
                address:
                  [
                    warehouse
                      .address
                      ?.addressLine1,
  
                    warehouse
                      .address
                      ?.addressLine2,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      ", "
                    ),
  
                city:
                  warehouse
                    .address
                    ?.city ||
                  "",
  
                state:
                  warehouse
                    .address
                    ?.state ||
                  "",
  
                country:
                  warehouse
                    .address
                    ?.country ||
                  "",
  
                isActive:
                  warehouse
                    .isActive ===
                  true,
  
              })
            );
  
  
        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              rows,
              "Purchase warehouses fetched successfully."
            )
          );
      }
    );