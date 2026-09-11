import crypto from "crypto";
import mongoose from "mongoose";

import PurchaseOrder from "../models/PurchaseOrder.js";
import LogisticsWarehouse from "../models/LogisticsWarehouse.js";

import goodsReceiptRepository from "../repositories/goodsReceipt.repository.js";
import purchaseOrderRepository from "../repositories/purchaseOrder.repository.js";

import { ApiError } from "../utils/apiError.js";

import {
  findPurchaseSeniorUserId,
  sendPurchaseWorkflowNotification
} from "./purchaseWorkflowNotification.service.js";


/* ============================================================
   HELPERS
============================================================ */

const clean = (
  value
) =>
  String(
    value ??
    ""
  )
    .trim();


const idString = (
  value
) =>
  clean(
    value?._id ??
    value
  );


const roundQuantity = (
  value
) =>
  Number(
    Number(
      value ||
      0
    )
      .toFixed(
        4
      )
  );


const sameId = (
  first,
  second
) =>
  Boolean(
    idString(
      first
    )
  ) &&
  idString(
    first
  ) ===
  idString(
    second
  );


/* ============================================================
   SERVICE
============================================================ */

class GoodsReceiptService {

  constructor(
    {
      goodsReceiptRepo =
        goodsReceiptRepository,

      purchaseOrderRepo =
        purchaseOrderRepository
    } = {}
  ) {

    this.goodsReceiptRepo =
      goodsReceiptRepo;

    this.purchaseOrderRepo =
      purchaseOrderRepo;
  }


  /* ==========================================================
     USER
  ========================================================== */

  userIdOf(
    user
  ) {

    const userId =
      user?._id ||
      user?.id;


    if (
      !userId
    ) {

      throw new ApiError(
        401,
        "Authenticated user is required."
      );
    }


    return userId;
  }


  userDisplayName(
    user
  ) {

    return (
      clean(
        user?.name
      ) ||
      clean(
        user?.fullName
      ) ||
      [
        clean(
          user?.firstName
        ),
        clean(
          user?.lastName
        )
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        ) ||
      clean(
        user?.email
      )
    );
  }


  /* ==========================================================
     CREATOR SCOPE

     Junior:
     - own GRNs only.

     Senior:
     - team/all by default.
     - own GRNs when scope === "my".
  ========================================================== */

  creatorScope(
    purchaseAccess,
    user
  ) {

    return {
      creatorEmployeeId:
        purchaseAccess?.employeeId ||
        null,

      creatorUserId:
        this.userIdOf(
          user
        )
    };
  }


  shouldApplyCreatorScope(
    purchaseAccess,
    scope = ""
  ) {

    return (
      purchaseAccess?.canApprove !==
        true ||
      scope ===
        "my"
    );
  }


  /* ==========================================================
     GRN NUMBER
  ========================================================== */

  async generateGrnNumber(
    companyId,
    {
      session = null
    } = {}
  ) {

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      String(
        now.getMonth() +
        1
      )
        .padStart(
          2,
          "0"
        );


    for (
      let attempt =
        0;
      attempt <
        10;
      attempt +=
        1
    ) {

      const suffix =
        crypto
          .randomBytes(
            3
          )
          .toString(
            "hex"
          )
          .toUpperCase();


      const grnNumber =
        `GRN-${year}${month}-${suffix}`;


      const existing =
        await this
          .goodsReceiptRepo
          .findByGrnNumber(
            companyId,
            grnNumber,
            {
              session
            }
          );


      if (
        !existing
      ) {

        return grnNumber;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate a unique GRN number."
    );
  }


  /* ==========================================================
     PURCHASE ORDER
  ========================================================== */

  async resolvePurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const purchaseOrder =
      await this
        .purchaseOrderRepo
        .findById(
          companyId,
          purchaseOrderId,
          {
            session
          }
        );


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    if (
      purchaseOrder.status ===
      "draft"
    ) {

      throw new ApiError(
        409,
        "Goods Receipt cannot be created for a Draft Purchase Order."
      );
    }


    if (
      purchaseOrder.status ===
      "cancelled"
    ) {

      throw new ApiError(
        409,
        "Goods Receipt cannot be created for a Cancelled Purchase Order."
      );
    }


    if (
      purchaseOrder.status ===
      "received"
    ) {

      throw new ApiError(
        409,
        "Purchase Order is already fully received."
      );
    }


    if (
      ![
        "approved",
        "sent",
        "partially_received"
      ]
        .includes(
          purchaseOrder.status
        )
    ) {

      throw new ApiError(
        409,
        "Purchase Order is not available for Goods Receipt."
      );
    }


    if (
      !Array.isArray(
        purchaseOrder.items
      ) ||
      purchaseOrder.items.length ===
        0
    ) {

      throw new ApiError(
        409,
        "Purchase Order does not contain receivable items."
      );
    }


    return purchaseOrder;
  }


  /* ==========================================================
     WAREHOUSE
  ========================================================== */

  async resolveWarehouse(
    companyId,
    warehouseId,
    {
      session = null
    } = {}
  ) {

    let query =
      LogisticsWarehouse
        .findOne({
          _id:
            warehouseId,

          companyId,

          isActive:
            true
        })
        .lean();


    if (
      session
    ) {

      query =
        query.session(
          session
        );
    }


    const warehouse =
      await query;


    if (
      !warehouse
    ) {

      throw new ApiError(
        404,
        "Selected warehouse was not found or is inactive."
      );
    }


    return warehouse;
  }


  warehouseDisplayName(
    warehouse
  ) {

    return (
      clean(
        warehouse?.warehouseName
      ) ||
      clean(
        warehouse?.name
      ) ||
      clean(
        warehouse?.warehouseCode
      ) ||
      clean(
        warehouse?.code
      ) ||
      "Warehouse"
    );
  }


  warehouseCode(
    warehouse
  ) {

    return (
      clean(
        warehouse?.warehouseCode
      ) ||
      clean(
        warehouse?.code
      )
    );
  }


  /* ==========================================================
     EXISTING RECEIPT QUANTITIES

     includePending = true:
     - approved
     - legacy
     - pending
     - rejected excluded

     Used for quantity reservation.

     includePending = false:
     - approved
     - legacy only

     Used for actual PO posted receipt state.
  ========================================================== */

  async existingReceiptMap(
    companyId,
    purchaseOrderId,
    {
      session = null,
      includePending = false
    } = {}
  ) {

    const rows =
      await this
        .goodsReceiptRepo
        .aggregateReceivedByPurchaseOrder(
          companyId,
          purchaseOrderId,
          {
            session,
            includePending
          }
        );


    const map =
      new Map();


    for (
      const row
      of rows
    ) {

      map.set(
        idString(
          row.purchaseOrderItemId
        ),
        {
          receivedQuantity:
            roundQuantity(
              row.receivedQuantity
            ),

          acceptedQuantity:
            roundQuantity(
              row.acceptedQuantity
            ),

          rejectedQuantity:
            roundQuantity(
              row.rejectedQuantity
            )
        }
      );
    }


    return map;
  }


  /* ==========================================================
     BUILD GRN ITEMS
  ========================================================== */

  buildReceiptItems(
    purchaseOrder,
    inputItems,
    receiptMap
  ) {

    if (
      !Array.isArray(
        inputItems
      ) ||
      inputItems.length ===
        0
    ) {

      throw new ApiError(
        400,
        "At least one Goods Receipt item is required."
      );
    }


    const poItemMap =
      new Map();


    for (
      const item
      of purchaseOrder.items
    ) {

      const key =
        idString(
          item._id
        );


      if (
        key
      ) {

        poItemMap.set(
          key,
          item
        );
      }
    }


    const seen =
      new Set();


    return inputItems.map(
      (
        input,
        index
      ) => {

        const purchaseOrderItemId =
          idString(
            input.purchaseOrderItemId
          );


        if (
          !purchaseOrderItemId
        ) {

          throw new ApiError(
            400,
            `Purchase Order item reference is required for GRN item ${index + 1}.`
          );
        }


        if (
          seen.has(
            purchaseOrderItemId
          )
        ) {

          throw new ApiError(
            400,
            "The same Purchase Order item cannot appear more than once in one GRN."
          );
        }


        seen.add(
          purchaseOrderItemId
        );


        const poItem =
          poItemMap.get(
            purchaseOrderItemId
          );


        if (
          !poItem
        ) {

          throw new ApiError(
            400,
            `GRN item ${index + 1} does not belong to the selected Purchase Order.`
          );
        }


        const orderedQuantity =
          roundQuantity(
            poItem.orderedQuantity
          );


        const previous =
          receiptMap.get(
            purchaseOrderItemId
          ) || {
            receivedQuantity:
              0
          };


        const previouslyReceivedQuantity =
          roundQuantity(
            previous.receivedQuantity
          );


        const availableQuantity =
          roundQuantity(
            orderedQuantity -
            previouslyReceivedQuantity
          );


        if (
          availableQuantity <=
          0
        ) {

          throw new ApiError(
            409,
            `${clean(poItem.itemName) || "Item"} is already fully received or reserved by another pending GRN.`
          );
        }


        const currentReceivedQuantity =
          roundQuantity(
            input.currentReceivedQuantity
          );


        const acceptedQuantity =
          roundQuantity(
            input.acceptedQuantity
          );


        const rejectedQuantity =
          roundQuantity(
            input.rejectedQuantity
          );


        if (
          currentReceivedQuantity <=
          0
        ) {

          throw new ApiError(
            400,
            `Received quantity must be greater than zero for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        if (
          currentReceivedQuantity >
          availableQuantity
        ) {

          throw new ApiError(
            409,
            `Received quantity for ${clean(poItem.itemName) || `item ${index + 1}`} cannot exceed available quantity ${availableQuantity}. Pending GRNs also reserve quantity.`
          );
        }


        if (
          Math.abs(
            (
              acceptedQuantity +
              rejectedQuantity
            ) -
            currentReceivedQuantity
          ) >
          0.000001
        ) {

          throw new ApiError(
            400,
            `Accepted plus rejected quantity must equal received quantity for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        if (
          rejectedQuantity >
            0 &&
          !clean(
            input.rejectionReason
          )
        ) {

          throw new ApiError(
            400,
            `Rejection reason is required for ${clean(poItem.itemName) || `item ${index + 1}`}.`
          );
        }


        const remainingQuantity =
          roundQuantity(
            orderedQuantity -
            previouslyReceivedQuantity -
            currentReceivedQuantity
          );


        return {

          purchaseOrderItemId:
            poItem._id,

          itemId:
            poItem.itemId ||
            null,

          itemName:
            clean(
              poItem.itemName
            ),

          description:
            clean(
              poItem.description
            ),

          unit:
            clean(
              poItem.unit
            ),

          orderedQuantity,

          previouslyReceivedQuantity,

          currentReceivedQuantity,

          acceptedQuantity,

          rejectedQuantity,

          remainingQuantity,

          rejectionReason:
            clean(
              input.rejectionReason
            )

        };
      }
    );
  }


  /* ==========================================================
     CALCULATE UPDATED PO RECEIPT STATE
  ========================================================== */

  buildUpdatedPurchaseOrderItems(
    purchaseOrder,
    grnItems,
    existingReceiptMap
  ) {

    const currentReceiptMap =
      new Map();


    for (
      const grnItem
      of grnItems
    ) {

      currentReceiptMap.set(
        idString(
          grnItem.purchaseOrderItemId
        ),
        roundQuantity(
          grnItem.currentReceivedQuantity
        )
      );
    }


    return purchaseOrder.items.map(
      (
        poItem
      ) => {

        const key =
          idString(
            poItem._id
          );


        const existing =
          existingReceiptMap.get(
            key
          ) || {
            receivedQuantity:
              0
          };


        const priorReceived =
          roundQuantity(
            existing.receivedQuantity
          );


        const currentReceived =
          roundQuantity(
            currentReceiptMap.get(
              key
            ) ||
            0
          );


        const ordered =
          roundQuantity(
            poItem.orderedQuantity
          );


        const received =
          roundQuantity(
            priorReceived +
            currentReceived
          );


        const remaining =
          roundQuantity(
            ordered -
            received
          );


        if (
          received >
          ordered
        ) {

          throw new ApiError(
            409,
            `Receipt quantity exceeds ordered quantity for ${clean(poItem.itemName) || "Purchase Order item"}.`
          );
        }


        return {

          ...(
            typeof poItem.toObject ===
            "function"
              ? poItem.toObject()
              : poItem
          ),

          receivedQuantity:
            received,

          remainingQuantity:
            remaining

        };
      }
    );
  }


  /* ==========================================================
     PURCHASE ORDER RECEIPT STATUS
  ========================================================== */

  determinePurchaseOrderStatus(
    updatedItems
  ) {

    const allReceived =
      updatedItems.every(
        (
          item
        ) =>
          roundQuantity(
            item.remainingQuantity
          ) <=
          0
      );


    if (
      allReceived
    ) {

      return "received";
    }


    const hasAnyReceipt =
      updatedItems.some(
        (
          item
        ) =>
          roundQuantity(
            item.receivedQuantity
          ) >
          0
      );


    if (
      hasAnyReceipt
    ) {

      return "partially_received";
    }


    return null;
  }


  /* ==========================================================
     GRN PHYSICAL STATUS
  ========================================================== */

  determineGrnStatus(
    grnItems,
    updatedPurchaseOrderItems
  ) {

    const currentReceived =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.currentReceivedQuantity
          ),
        0
      );


    const currentAccepted =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.acceptedQuantity
          ),
        0
      );


    const currentRejected =
      grnItems.reduce(
        (
          total,
          item
        ) =>
          total +
          roundQuantity(
            item.rejectedQuantity
          ),
        0
      );


    const allPoItemsComplete =
      updatedPurchaseOrderItems.every(
        (
          item
        ) =>
          roundQuantity(
            item.remainingQuantity
          ) <=
          0
      );


    if (
      currentRejected >
        0 &&
      currentAccepted ===
        0 &&
      Math.abs(
        currentRejected -
        currentReceived
      ) <=
        0.000001
    ) {

      return "rejected";
    }


    if (
      allPoItemsComplete
    ) {

      return "completed";
    }


    return "partial";
  }


  /* ==========================================================
     CREATE GRN

     JUNIOR:
     - Creates pending GRN.
     - Pending quantity reserves stock against the PO.
     - PO receipt quantities are NOT changed.
     - Senior receives approval notification.

     SENIOR:
     - Can perform operational GRN creation.
     - Own GRN is approved immediately.
     - PO receipt quantities/status are updated immediately.
     - GRN creation + PO update happen in same transaction.
     - No approval notification is generated.
  ========================================================== */

  async create(
    companyId,
    payload,
    user,
    purchaseAccess
  ) {

    const userId =
      this.userIdOf(
        user
      );


    const isSenior =
      purchaseAccess?.canApprove ===
      true;


    const creatorName =
      clean(
        purchaseAccess?.employeeName
      ) ||
      this.userDisplayName(
        user
      );


    const session =
      await mongoose
        .startSession();


    try {

      let createdGrn =
        null;


      await session.withTransaction(
        async () => {

          const purchaseOrder =
            await this
              .resolvePurchaseOrder(
                companyId,
                payload.purchaseOrderId,
                {
                  session
                }
              );


          const deliveryType =
            purchaseOrder.deliveryType ||
            "company_warehouse";


          const warehouse =
            deliveryType ===
              "company_warehouse"
              ? await this
                  .resolveWarehouse(
                    companyId,
                    payload.warehouseId ||
                      purchaseOrder.warehouseId,
                    {
                      session
                    }
                  )
              : null;


          /*
           * Company Warehouse delivery:
           * GRN must use the same warehouse as PO.
           */
          if (
            warehouse &&
            purchaseOrder.warehouseId &&
            !sameId(
              purchaseOrder.warehouseId,
              warehouse._id
            )
          ) {

            throw new ApiError(
              409,
              "Goods Receipt warehouse must match the Purchase Order warehouse."
            );
          }


          const duplicateChallan =
            await this
              .goodsReceiptRepo
              .findByDeliveryChallan(
                companyId,
                purchaseOrder.vendorId,
                payload.deliveryChallanNumber,
                {
                  session
                }
              );


          if (
            duplicateChallan
          ) {

            throw new ApiError(
              409,
              "This delivery challan number has already been used for the vendor."
            );
          }


          /*
           * Reservation Map:
           *
           * Includes:
           * - Approved GRNs
           * - Legacy GRNs
           * - Pending GRNs
           *
           * Excludes:
           * - Rejected GRNs
           *
           * Both Junior and Senior must respect pending reservations.
           */
          const reservedReceiptMap =
            await this
              .existingReceiptMap(
                companyId,
                purchaseOrder._id,
                {
                  session,
                  includePending:
                    true
                }
              );


          const grnItems =
            this
              .buildReceiptItems(
                purchaseOrder,
                payload.items,
                reservedReceiptMap
              );


          /*
           * For Junior:
           * this is only used to calculate the GRN's physical
           * completion snapshot. It is NOT persisted to PO.
           *
           * For Senior:
           * PO must contain only approved/legacy receipts +
           * the Senior's current immediately-approved GRN.
           *
           * Pending Junior GRNs must NOT be posted into PO.
           */
          let receiptStateForPo =
            reservedReceiptMap;


          if (
            isSenior
          ) {

            receiptStateForPo =
              await this
                .existingReceiptMap(
                  companyId,
                  purchaseOrder._id,
                  {
                    session,
                    includePending:
                      false
                  }
                );
          }


          const updatedPurchaseOrderItems =
            this
              .buildUpdatedPurchaseOrderItems(
                purchaseOrder,
                grnItems,
                receiptStateForPo
              );


          const purchaseOrderStatus =
            this
              .determinePurchaseOrderStatus(
                updatedPurchaseOrderItems
              );


          if (
            !purchaseOrderStatus
          ) {

            throw new ApiError(
              409,
              "Unable to determine Purchase Order receipt status."
            );
          }


          const grnStatus =
            this
              .determineGrnStatus(
                grnItems,
                updatedPurchaseOrderItems
              );


          const grnNumber =
            await this
              .generateGrnNumber(
                companyId,
                {
                  session
                }
              );


          const now =
            new Date();


          const approvalFields =
            isSenior
              ? {
                  approvalStatus:
                    "approved",

                  approvedAt:
                    now,

                  approvedBy:
                    userId,

                  approvedByName:
                    creatorName
                }
              : {
                  approvalStatus:
                    "pending_approval"
                };


          createdGrn =
            await this
              .goodsReceiptRepo
              .create(
                {

                  companyId,

                  grnNumber,

                  purchaseOrderId:
                    purchaseOrder._id,

                  poNumber:
                    clean(
                      purchaseOrder.poNumber
                    ),

                  receiptDate:
                    payload.receiptDate
                      ? new Date(
                          payload.receiptDate
                        )
                      : now,

                  vendorId:
                    purchaseOrder.vendorId,

                  vendorName:
                    clean(
                      purchaseOrder.vendorName
                    ),

                  vendorCode:
                    clean(
                      purchaseOrder.vendorCode
                    ),

                  warehouseId:
                    warehouse?._id ||
                    null,

                  warehouseName:
                    warehouse
                      ? this.warehouseDisplayName(
                          warehouse
                        )
                      : "",

                  warehouseCode:
                    warehouse
                      ? this.warehouseCode(
                          warehouse
                        )
                      : "",

                  deliveryType,

                  deliveryLocationName:
                    clean(
                      purchaseOrder.deliveryLocationName
                    ),

                  deliveryAddress:
                    clean(
                      purchaseOrder.deliveryAddress
                    ),

                  deliveryContactPerson:
                    clean(
                      purchaseOrder.deliveryContactPerson
                    ),

                  deliveryContactNumber:
                    clean(
                      purchaseOrder.deliveryContactNumber
                    ),

                  otherDeliveryType:
                    clean(
                      purchaseOrder.otherDeliveryType
                    ),

                  deliveryChallanNumber:
                    clean(
                      payload.deliveryChallanNumber
                    ),

                  items:
                    grnItems,

                  receivedBy:
                    userId,

                  receivedByName:
                    this.userDisplayName(
                      user
                    ),

                  remarks:
                    clean(
                      payload.remarks
                    ),

                  status:
                    grnStatus,

                  ...approvalFields,

                  createdByEmployeeId:
                    purchaseAccess?.employeeId ||
                    null,

                  createdByEmployeeName:
                    creatorName,

                  createdByEmployeeCode:
                    clean(
                      purchaseAccess?.employeeCode
                    ),

                  submittedAt:
                    now,

                  submittedBy:
                    userId,

                  createdBy:
                    userId,

                  updatedBy:
                    userId

                },
                {
                  session
                }
              );


          /*
           * Senior-created GRN:
           *
           * PO receipt state must be changed immediately because
           * the GRN is already approved.
           *
           * Junior-created GRN intentionally does not reach here.
           */
          if (
            isSenior
          ) {

            const updatedPurchaseOrder =
              await this
                .purchaseOrderRepo
                .updateReceiptStateById(
                  companyId,
                  purchaseOrder._id,
                  {
                    items:
                      updatedPurchaseOrderItems,

                    status:
                      purchaseOrderStatus,

                    updatedBy:
                      userId
                  },
                  {
                    session
                  }
                );


            if (
              !updatedPurchaseOrder
            ) {

              throw new ApiError(
                409,
                "Purchase Order receipt quantities changed. Please retry."
              );
            }
          }

        }
      );


      if (
        !createdGrn
      ) {

        throw new ApiError(
          500,
          "Goods Receipt could not be created."
        );
      }


      const result =
        await this
          .getById(
            companyId,
            createdGrn._id
          );


      /*
       * Junior GRN only:
       * notify Purchase Senior for approval.
       *
       * Senior-created GRN is already approved and therefore
       * must not generate an awaiting-approval notification.
       */
      if (
        !isSenior
      ) {

        const approverUserId =
          await findPurchaseSeniorUserId({
            companyId,
            requesterUserId:
              userId
          });


        await sendPurchaseWorkflowNotification({
          companyId,

          recipientUserId:
            approverUserId,

          senderUserId:
            userId,

          title:
            "GRN awaiting approval",

          message:
            `${result.grnNumber || "Goods Receipt"} requires your review.`,

          entityType:
            "GoodsReceipt",

          entityId:
            result._id,

          actionUrl:
            `/purchase/goods-receipts/${result._id}`
        });
      }


      return result;

    } finally {

      await session
        .endSession();

    }
  }


  /* ==========================================================
     APPROVE JUNIOR PENDING GRN
  ========================================================== */

  async approve(
    companyId,
    goodsReceiptId,
    user,
    purchaseAccess
  ) {

    if (
      purchaseAccess?.canApprove !==
      true
    ) {

      throw new ApiError(
        403,
        "Only an authorized Purchase Senior can approve a GRN."
      );
    }


    const userId =
      this.userIdOf(
        user
      );


    const session =
      await mongoose
        .startSession();


    let approved =
      null;


    try {

      await session.withTransaction(
        async () => {

          const grn =
            await this
              .goodsReceiptRepo
              .findById(
                companyId,
                goodsReceiptId,
                {
                  session
                }
              );


          if (
            !grn
          ) {

            throw new ApiError(
              404,
              "Goods Receipt was not found."
            );
          }


          if (
            grn.approvalStatus !==
            "pending_approval"
          ) {

            throw new ApiError(
              409,
              "Only a pending GRN can be approved."
            );
          }


          const purchaseOrder =
            await this
              .resolvePurchaseOrder(
                companyId,
                grn.purchaseOrderId,
                {
                  session
                }
              );


          /*
           * Only already-approved / legacy GRNs are posted
           * into the current PO state.
           *
           * This pending GRN is then added exactly once.
           */
          const approvedReceiptMap =
            await this
              .existingReceiptMap(
                companyId,
                purchaseOrder._id,
                {
                  session,
                  includePending:
                    false
                }
              );


          const updatedItems =
            this
              .buildUpdatedPurchaseOrderItems(
                purchaseOrder,
                grn.items,
                approvedReceiptMap
              );


          const status =
            this
              .determinePurchaseOrderStatus(
                updatedItems
              );


          if (
            !status
          ) {

            throw new ApiError(
              409,
              "Unable to determine Purchase Order receipt status."
            );
          }


          const updatedPurchaseOrder =
            await this
              .purchaseOrderRepo
              .updateReceiptStateById(
                companyId,
                purchaseOrder._id,
                {
                  items:
                    updatedItems,

                  status,

                  updatedBy:
                    userId
                },
                {
                  session
                }
              );


          if (
            !updatedPurchaseOrder
          ) {

            throw new ApiError(
              409,
              "Purchase Order receipt quantities changed. Please retry."
            );
          }


          approved =
            await this
              .goodsReceiptRepo
              .approvePendingById(
                companyId,
                goodsReceiptId,
                {
                  approvalStatus:
                    "approved",

                  approvedAt:
                    new Date(),

                  approvedBy:
                    userId,

                  approvedByName:
                    clean(
                      purchaseAccess?.employeeName
                    ) ||
                    this.userDisplayName(
                      user
                    ),

                  updatedBy:
                    userId
                },
                {
                  session
                }
              );


          if (
            !approved
          ) {

            throw new ApiError(
              409,
              "Goods Receipt approval state changed. Please refresh and retry."
            );
          }

        }
      );

    } finally {

      await session
        .endSession();

    }


    await sendPurchaseWorkflowNotification({
      companyId,

      recipientUserId:
        approved.createdBy,

      senderUserId:
        userId,

      title:
        "GRN approved",

      message:
        `${approved.grnNumber || "Goods Receipt"} has been approved.`,

      entityType:
        "GoodsReceipt",

      entityId:
        approved._id,

      actionUrl:
        `/purchase/goods-receipts/${approved._id}`
    });


    return approved;
  }


  /* ==========================================================
     REJECT JUNIOR PENDING GRN
  ========================================================== */

  async reject(
    companyId,
    goodsReceiptId,
    reason,
    user,
    purchaseAccess
  ) {

    if (
      purchaseAccess?.canApprove !==
      true
    ) {

      throw new ApiError(
        403,
        "Only an authorized Purchase Senior can reject a GRN."
      );
    }


    const userId =
      this.userIdOf(
        user
      );


    const rejected =
      await this
        .goodsReceiptRepo
        .rejectPendingById(
          companyId,
          goodsReceiptId,
          {
            approvalStatus:
              "rejected",

            rejectedAt:
              new Date(),

            rejectedBy:
              userId,

            rejectedByName:
              clean(
                purchaseAccess?.employeeName
              ) ||
              this.userDisplayName(
                user
              ),

            approvalRejectionReason:
              clean(
                reason
              ),

            updatedBy:
              userId
          }
        );


    if (
      !rejected
    ) {

      throw new ApiError(
        409,
        "Only a pending GRN can be rejected."
      );
    }


    await sendPurchaseWorkflowNotification({
      companyId,

      recipientUserId:
        rejected.createdBy,

      senderUserId:
        userId,

      title:
        "GRN rejected",

      message:
        `${rejected.grnNumber || "Goods Receipt"} was rejected: ${clean(reason)}`,

      entityType:
        "GoodsReceipt",

      entityId:
        rejected._id,

      actionUrl:
        `/purchase/goods-receipts/${rejected._id}`
    });


    return rejected;
  }


  /* ==========================================================
     LIST

     Junior:
     - always own work.

     Senior:
     - default/team = all Purchase GRNs.
     - scope=my = own work.
  ========================================================== */

  async list(
    companyId,
    filters = {},
    purchaseAccess,
    user
  ) {

    const scopedFilters = {
      ...filters
    };


    if (
      this.shouldApplyCreatorScope(
        purchaseAccess,
        filters.scope
      )
    ) {

      Object.assign(
        scopedFilters,
        this.creatorScope(
          purchaseAccess,
          user
        )
      );
    }


    return this
      .goodsReceiptRepo
      .list(
        companyId,
        scopedFilters
      );
  }


  /* ==========================================================
     GET BY ID

     Junior cannot open another employee's GRN directly.
     Senior may open team GRNs.
  ========================================================== */

  async getById(
    companyId,
    id,
    purchaseAccess = null,
    user = null
  ) {

    const options = {};


    if (
      purchaseAccess &&
      user &&
      purchaseAccess?.canApprove !==
        true
    ) {

      Object.assign(
        options,
        this.creatorScope(
          purchaseAccess,
          user
        )
      );
    }


    const goodsReceipt =
      await this
        .goodsReceiptRepo
        .findById(
          companyId,
          id,
          options
        );


    if (
      !goodsReceipt
    ) {

      throw new ApiError(
        404,
        "Goods Receipt was not found."
      );
    }


    return goodsReceipt;
  }


  /* ==========================================================
     GET BY PURCHASE ORDER

     Junior:
     - own GRN history for the PO.

     Senior:
     - complete Purchase team GRN history for the PO.
  ========================================================== */

  async getByPurchaseOrder(
    companyId,
    purchaseOrderId,
    purchaseAccess = null,
    user = null
  ) {

    const purchaseOrder =
      await PurchaseOrder
        .findOne({
          _id:
            purchaseOrderId,

          companyId
        })
        .select(
          "_id"
        )
        .lean();


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    const options = {};


    if (
      purchaseAccess &&
      user &&
      purchaseAccess?.canApprove !==
        true
    ) {

      Object.assign(
        options,
        this.creatorScope(
          purchaseAccess,
          user
        )
      );
    }


    return this
      .goodsReceiptRepo
      .findByPurchaseOrder(
        companyId,
        purchaseOrderId,
        options
      );
  }


  /* ==========================================================
     STATUS COUNTS

     Junior:
     - own counts.

     Senior:
     - team counts by default.
     - own counts when scope=my.
  ========================================================== */

  async statusCounts(
    companyId,
    purchaseAccess = null,
    user = null,
    filters = {}
  ) {

    const options = {};


    if (
      purchaseAccess &&
      user &&
      this.shouldApplyCreatorScope(
        purchaseAccess,
        filters?.scope
      )
    ) {

      Object.assign(
        options,
        this.creatorScope(
          purchaseAccess,
          user
        )
      );
    }


    return this
      .goodsReceiptRepo
      .countByStatus(
        companyId,
        options
      );
  }


  /* ==========================================================
     RECEIPT SUMMARY FOR PO

     Intentionally NOT employee scoped.

     This is the operational PO state and therefore must reflect
     all approved/legacy GRNs for the company/PO.
  ========================================================== */

  async purchaseOrderReceiptSummary(
    companyId,
    purchaseOrderId
  ) {

    const purchaseOrder =
      await this
        .purchaseOrderRepo
        .findById(
          companyId,
          purchaseOrderId
        );


    if (
      !purchaseOrder
    ) {

      throw new ApiError(
        404,
        "Purchase Order was not found."
      );
    }


    const aggregates =
      await this
        .goodsReceiptRepo
        .aggregateReceivedByPurchaseOrder(
          companyId,
          purchaseOrderId
        );


    const aggregateMap =
      new Map();


    for (
      const row
      of aggregates
    ) {

      aggregateMap.set(
        idString(
          row.purchaseOrderItemId
        ),
        row
      );
    }


    const items =
      purchaseOrder.items.map(
        (
          item
        ) => {

          const aggregate =
            aggregateMap.get(
              idString(
                item._id
              )
            ) || {
              receivedQuantity:
                0,

              acceptedQuantity:
                0,

              rejectedQuantity:
                0
            };


          const orderedQuantity =
            roundQuantity(
              item.orderedQuantity
            );


          const receivedQuantity =
            roundQuantity(
              aggregate.receivedQuantity
            );


          return {

            purchaseOrderItemId:
              item._id,

            itemId:
              item.itemId ||
              null,

            itemName:
              clean(
                item.itemName
              ),

            unit:
              clean(
                item.unit
              ),

            orderedQuantity,

            receivedQuantity,

            acceptedQuantity:
              roundQuantity(
                aggregate.acceptedQuantity
              ),

            rejectedQuantity:
              roundQuantity(
                aggregate.rejectedQuantity
              ),

            remainingQuantity:
              roundQuantity(
                orderedQuantity -
                receivedQuantity
              )

          };
        }
      );


    const grnCount =
      await this
        .goodsReceiptRepo
        .countForPurchaseOrder(
          companyId,
          purchaseOrderId
        );


    return {

      purchaseOrderId:
        purchaseOrder._id,

      poNumber:
        purchaseOrder.poNumber,

      status:
        purchaseOrder.status,

      vendorId:
        purchaseOrder.vendorId,

      vendorName:
        purchaseOrder.vendorName,

      warehouseId:
        purchaseOrder.warehouseId ||
        null,

      warehouseName:
        purchaseOrder.warehouseName ||
        "",

      grnCount,

      items

    };
  }

}


const goodsReceiptService =
  new GoodsReceiptService();


export {
  GoodsReceiptService
};


export default goodsReceiptService;