import crypto from "node:crypto";

import purchaseRequestRepository
  from "../repositories/purchaseRequest.repository.js";

import {
  createNotificationRecord,
} from "../repositories/communication.repository.js";

import {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPE,
} from "../models/Notification.js";

import {
  emitNotificationToUser,
} from "../socket/socket.js";

  import {
    Employee
  } from "../models/Employee.js";


/* ============================================================
   HELPERS
============================================================ */

const purchaseRequestDatePart =
  (
    value
  ) => {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      throw new Error(
        "Invalid Purchase Request date."
      );
    }


    const year =
      String(
        date.getUTCFullYear()
      );


    const month =
      String(
        date.getUTCMonth() + 1
      )
        .padStart(
          2,
          "0"
        );


    const day =
      String(
        date.getUTCDate()
      )
        .padStart(
          2,
          "0"
        );


    return `${year}${month}${day}`;
  };


const generatePurchaseRequestNumber =
  (
    requestDate
  ) => {

    const datePart =
      purchaseRequestDatePart(
        requestDate
      );


    const randomPart =
      crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();


    return [
      "PR",
      datePart,
      randomPart,
    ].join("-");
  };


const cleanText =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .trim();


const normalizeDepartmentValue =
  (
    value
  ) =>
    cleanText(
      value
    )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .trim();


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

      department.slug,

    ]
      .map(
        normalizeDepartmentValue
      )
      .filter(
        Boolean
      );


    return values.some(
      (
        value
      ) =>
        value === "purchase" ||
        value === "purchases" ||
        value === "purchasing" ||
        value === "purchase department" ||
        value.includes(
          "purchase"
        )
    );
  };


/* ============================================================
   PURCHASE REQUEST SERVICE
============================================================ */

export class PurchaseRequestService {

  constructor(
    {
      repository =
        purchaseRequestRepository,

      employeeModel =
        Employee,

      notificationCreator =
        createNotificationRecord,

      notificationEmitter =
        emitNotificationToUser,
    } = {}
  ) {

    this.repository =
      repository;


    this.employeeModel =
      employeeModel;


    this.notificationCreator =
      notificationCreator;


    this.notificationEmitter =
      notificationEmitter;

  }


  async createWorkflowNotification({
    companyId,
    recipientUserId,
    senderUserId,
    title,
    message,
    purchaseRequestId,
  }) {

    if (
      !recipientUserId ||
      String(recipientUserId) === String(senderUserId)
    ) {
      return;
    }


    try {
      const notification =
        await this.notificationCreator({
          companyId,
          recipientUserId,
          senderUserId: senderUserId || null,
          type: NOTIFICATION_TYPE.SYSTEM,
          title,
          message,
          entityType: "PurchaseRequest",
          entityId: purchaseRequestId,
          priority: NOTIFICATION_PRIORITY.NORMAL,
          actionUrl: `/purchase/purchase-requests/${purchaseRequestId}`,
          createdBy: senderUserId || null,
        });

      this.notificationEmitter(
        recipientUserId,
        notification
      );
    } catch (error) {
      console.error(
        "Purchase Request notification delivery failed:",
        error
      );
    }
  }


  async findPurchaseApprover({
    companyId,
    departmentId,
    requesterUserId,
  }) {

    const activeFilter = {
      companyId,
      departmentId,
      employeeStatus: "active",
      isActive: true,
      userId: { $ne: null },
    };

    const requester =
      await this.employeeModel
        .findOne({
          companyId,
          userId: requesterUserId,
          departmentId,
        })
        .select("reportingManagerId")
        .lean();

    if (requester?.reportingManagerId) {
      const manager =
        await this.employeeModel
          .findOne({
            ...activeFilter,
            _id: requester.reportingManagerId,
            organizationRole: {
              $in: [
                "department_head",
                "team_leader",
              ],
            },
          })
          .select("userId")
          .lean();

      if (
        manager?.userId &&
        String(manager.userId) !== String(requesterUserId)
      ) {
        return manager.userId;
      }
    }

    for (const organizationRole of [
      "department_head",
      "team_leader",
    ]) {
      const approver =
        await this.employeeModel
          .findOne({
            ...activeFilter,
            organizationRole,
            userId: { $nin: [null, requesterUserId] },
          })
          .select("userId")
          .lean();

      if (approver?.userId) {
        return approver.userId;
      }
    }

    return null;
  }


  async resolveRequesterUserId({
    companyId,
    request,
  }) {

    const requestedBy =
      request?.requestedBy?._id ||
      request?.requestedBy;

    if (requestedBy) {
      return requestedBy;
    }

    if (!request?.requestedEmployeeCode) {
      return null;
    }

    const employee =
      await this.employeeModel
        .findOne({
          companyId,
          employeeCode: request.requestedEmployeeCode,
        })
        .select("userId")
        .lean();

    return employee?.userId || null;
  }


  /* ==========================================================
     RESOLVE REQUESTER SNAPSHOT

     The authenticated user is mapped to the existing Employee
     record inside the same company.

     This keeps requester and department backend-controlled.
  ========================================================== */

  async resolveRequesterSnapshot({
    companyId,
    userId,
    employeeCode = "",
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    const orConditions =
      [];


    if (
      userId
    ) {

      orConditions.push({
        userId,
      });
    }


    const normalizedEmployeeCode =
      cleanText(
        employeeCode
      )
        .toUpperCase();


    if (
      normalizedEmployeeCode
    ) {

      orConditions.push({
        employeeCode:
          normalizedEmployeeCode,
      });
    }


    if (
      orConditions.length === 0
    ) {

      return {

        requestedBy:
          userId ||
          null,

        requestedEmployeeCode:
          normalizedEmployeeCode,

        requestedByName:
          "",

        departmentId:
          null,

        departmentName:
          "",

        departmentCode:
          "",

      };
    }


    const employee =
      await this
        .employeeModel
        .findOne({

          companyId,

          $or:
            orConditions,

        })
        .populate(
          "departmentId",
          "departmentName departmentCode name code featureKey key slug"
        )
        .lean();


    if (
      !employee
    ) {

      return {

        requestedBy:
          userId ||
          null,

        requestedEmployeeCode:
          normalizedEmployeeCode,

        requestedByName:
          "",

        departmentId:
          null,

        departmentName:
          "",

        departmentCode:
          "",

      };
    }


    const department =
      employee.departmentId ||
      null;


    const requestedByName =
      cleanText(
        employee.fullName ||
        employee.employeeName ||
        employee.name ||
        [
          employee.firstName,
          employee.lastName,
        ]
          .filter(
            Boolean
          )
          .join(" ")
      );


    const departmentName =
      cleanText(
        department?.departmentName ||
        department?.name
      );


    const departmentCode =
      cleanText(
        department?.departmentCode ||
        department?.code
      )
        .toUpperCase();


    return {

      requestedBy:
        userId ||
        employee.userId ||
        null,

      requestedEmployeeCode:
        cleanText(
          employee.employeeCode ||
          normalizedEmployeeCode
        )
          .toUpperCase(),

      requestedByName,

      departmentId:
        department?._id ||
        null,

      departmentName,

      departmentCode,

      department,

    };
  }


  /* ==========================================================
     CREATE PURCHASE REQUEST
  ========================================================== */

  async createPurchaseRequest({
    companyId,
    userId,
    employeeCode = "",
    payload,
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    if (
      !payload
    ) {

      throw new Error(
        "Purchase Request payload is required."
      );
    }


    const requester =
      await this
        .resolveRequesterSnapshot({
          companyId,
          userId,
          employeeCode,
        });


    /*
     * Normal Purchase employees should originate from the
     * Purchase department.
     *
     * Company-level users may not have an Employee record, so
     * this service does not deny merely because department is
     * missing. Parent Purchase access middleware remains the
     * authoritative permission boundary.
     */

    if (
      requester.department &&
      !isPurchaseDepartment(
        requester.department
      )
    ) {

      throw new Error(
        "Authenticated employee does not belong to the Purchase department."
      );
    }


    const createPayload = {

      companyId,

      prNumber:
        generatePurchaseRequestNumber(
          payload.requestDate
        ),

      requestDate:
        payload.requestDate,

      requestedBy:
        requester.requestedBy,

      requestedEmployeeCode:
        requester.requestedEmployeeCode,

      requestedByName:
        requester.requestedByName,

      departmentId:
        requester.departmentId,

      departmentName:
        requester.departmentName,

      departmentCode:
        requester.departmentCode,

      itemName:
        cleanText(
          payload.itemName
        ),

      description:
        cleanText(
          payload.description
        ),

      requiredQuantity:
        Number(
          payload.requiredQuantity
        ),

      unit:
        cleanText(
          payload.unit
        ),

      requiredDate:
        payload.requiredDate,

      purpose:
        cleanText(
          payload.purpose
        ),

      priority:
        payload.priority ||
        "medium",

      remarks:
        cleanText(
          payload.remarks
        ),

      status:
        "draft",

      submittedAt:
        null,

      submittedBy:
        null,

      approvedAt:
        null,

      approvedBy:
        null,

      approvalRemarks:
        "",

      rejectedAt:
        null,

      rejectedBy:
        null,

      rejectionReason:
        "",

      createdBy:
        userId ||
        null,

      updatedBy:
        userId ||
        null,

    };


    return this
      .repository
      .create(
        createPayload
      );
  }


  /* ==========================================================
     LIST PURCHASE REQUESTS
  ========================================================== */

  async listPurchaseRequests({
    companyId,
    query = {},
  }) {

    if (
      !companyId
    ) {

      throw new Error(
        "Company ID is required."
      );
    }


    return this
      .repository
      .list({

        companyId,

        ...query,

      });
  }


  /* ==========================================================
     GET PURCHASE REQUEST
  ========================================================== */

  async getPurchaseRequest({
    companyId,
    purchaseRequestId,
  }) {

    const request =
      await this
        .repository
        .findById({
          companyId,
          purchaseRequestId,
        });


    if (
      !request
    ) {

      throw new Error(
        "Purchase Request not found."
      );
    }


    return request;
  }


  /* ==========================================================
     UPDATE PURCHASE REQUEST

     Repository guarantees:
       only draft requests are editable.
  ========================================================== */

  async updatePurchaseRequest({
    companyId,
    purchaseRequestId,
    userId,
    payload,
  }) {

    const updatePayload = {
      ...payload,

      updatedBy:
        userId ||
        null,
    };


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "itemName"
        )
    ) {

      updatePayload.itemName =
        cleanText(
          updatePayload.itemName
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "description"
        )
    ) {

      updatePayload.description =
        cleanText(
          updatePayload.description
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "unit"
        )
    ) {

      updatePayload.unit =
        cleanText(
          updatePayload.unit
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "purpose"
        )
    ) {

      updatePayload.purpose =
        cleanText(
          updatePayload.purpose
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "remarks"
        )
    ) {

      updatePayload.remarks =
        cleanText(
          updatePayload.remarks
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          updatePayload,
          "requiredQuantity"
        )
    ) {

      updatePayload.requiredQuantity =
        Number(
          updatePayload.requiredQuantity
        );
    }


    const request =
      await this
        .repository
        .updateDraftById({
          companyId,
          purchaseRequestId,
          payload:
            updatePayload,
        });


    if (
      !request
    ) {

      throw new Error(
        "Purchase Request not found or is no longer editable."
      );
    }


    return request;
  }


  /* ==========================================================
     SUBMIT PURCHASE REQUEST

       draft → pending_approval
  ========================================================== */

  async submitPurchaseRequest({
    companyId,
    purchaseRequestId,
    userId,
    remarks = "",
  }) {

    const request =
      await this
        .repository
        .submitById({
          companyId,
          purchaseRequestId,

          userId:
            userId ||
            null,

          remarks:
            cleanText(
              remarks
            ),
        });


    if (
      !request
    ) {

      throw new Error(
        "Purchase Request not found or cannot be submitted."
      );
    }


    const approverUserId =
      await this.findPurchaseApprover({
        companyId,
        departmentId: request.departmentId,
        requesterUserId: userId,
      });

    await this.createWorkflowNotification({
      companyId,
      recipientUserId: approverUserId,
      senderUserId: userId,
      title: "Purchase Request awaiting approval",
      message: `${request.prNumber || "Purchase Request"} was submitted for your approval.`,
      purchaseRequestId: request._id,
    });


    return request;
  }


  /* ==========================================================
     APPROVE PURCHASE REQUEST

       pending_approval → approved

     Access to this service method must be restricted by the
     Purchase permission layer/controller route architecture.
  ========================================================== */

  async approvePurchaseRequest({
    companyId,
    purchaseRequestId,
    userId,
    remarks = "",
  }) {

    const request =
      await this
        .repository
        .approveById({
          companyId,
          purchaseRequestId,

          userId:
            userId ||
            null,

          remarks:
            cleanText(
              remarks
            ),
        });


    if (
      !request
    ) {

      throw new Error(
        "Purchase Request not found or cannot be approved."
      );
    }


    const requesterUserId =
      await this.resolveRequesterUserId({
        companyId,
        request,
      });

    await this.createWorkflowNotification({
      companyId,
      recipientUserId: requesterUserId,
      senderUserId: userId,
      title: "Purchase Request approved",
      message: `${request.prNumber || "Your Purchase Request"} has been approved.`,
      purchaseRequestId: request._id,
    });


    return request;
  }


  /* ==========================================================
     REJECT PURCHASE REQUEST

       pending_approval → rejected
  ========================================================== */

  async rejectPurchaseRequest({
    companyId,
    purchaseRequestId,
    userId,
    rejectionReason,
  }) {

    const cleanReason =
      cleanText(
        rejectionReason
      );


    if (
      cleanReason.length < 3
    ) {

      throw new Error(
        "Rejection reason is required."
      );
    }


    const request =
      await this
        .repository
        .rejectById({
          companyId,
          purchaseRequestId,

          userId:
            userId ||
            null,

          rejectionReason:
            cleanReason,
        });


    if (
      !request
    ) {

      throw new Error(
        "Purchase Request not found or cannot be rejected."
      );
    }


    const requesterUserId =
      await this.resolveRequesterUserId({
        companyId,
        request,
      });

    await this.createWorkflowNotification({
      companyId,
      recipientUserId: requesterUserId,
      senderUserId: userId,
      title: "Purchase Request rejected",
      message: `${request.prNumber || "Your Purchase Request"} has been rejected.`,
      purchaseRequestId: request._id,
    });


    return request;
  }


  /* ==========================================================
     GENERIC STATUS UPDATE

     Existing frontend service currently exposes:
       PATCH /purchase/requests/:id/status

     We do NOT allow arbitrary status mutation.

     Supported transitions:
       draft             → pending_approval
       pending_approval  → approved
       pending_approval  → rejected

     Other transitions are rejected.
  ========================================================== */

  async updatePurchaseRequestStatus({
    companyId,
    purchaseRequestId,
    userId,
    status,
    remarks = "",
  }) {

    const current =
      await this
        .getPurchaseRequest({
          companyId,
          purchaseRequestId,
        });


    const nextStatus =
      cleanText(
        status
      )
        .toLowerCase();


    if (
      current.status ===
        nextStatus
    ) {

      return current;
    }


    if (
      current.status ===
        "draft" &&
      nextStatus ===
        "pending_approval"
    ) {

      return this
        .submitPurchaseRequest({
          companyId,
          purchaseRequestId,
          userId,
          remarks,
        });
    }


    if (
      current.status ===
        "pending_approval" &&
      nextStatus ===
        "approved"
    ) {

      return this
        .approvePurchaseRequest({
          companyId,
          purchaseRequestId,
          userId,
          remarks,
        });
    }


    if (
      current.status ===
        "pending_approval" &&
      nextStatus ===
        "rejected"
    ) {

      const cleanRemarks =
        cleanText(
          remarks
        );


      if (
        cleanRemarks.length < 3
      ) {

        throw new Error(
          "Rejection reason is required when rejecting a Purchase Request."
        );
      }


      return this
        .rejectPurchaseRequest({
          companyId,
          purchaseRequestId,
          userId,

          rejectionReason:
            cleanRemarks,
        });
    }


    throw new Error(
      `Invalid Purchase Request status transition: ${current.status} -> ${nextStatus}.`
    );
  }


  /* ==========================================================
     DASHBOARD STATUS COUNTS
  ========================================================== */

  async getStatusCounts({
    companyId,
  }) {

    const rows =
      await this
        .repository
        .countByStatus({
          companyId,
        });


    const counts = {

      total:
        0,

      draft:
        0,

      pendingApproval:
        0,

      approved:
        0,

      rejected:
        0,

    };


    for (
      const row of
        rows
    ) {

      const count =
        Number(
          row.count ||
          0
        );


      counts.total +=
        count;


      if (
        row._id ===
        "draft"
      ) {

        counts.draft =
          count;
      }


      if (
        row._id ===
        "pending_approval"
      ) {

        counts.pendingApproval =
          count;
      }


      if (
        row._id ===
        "approved"
      ) {

        counts.approved =
          count;
      }


      if (
        row._id ===
        "rejected"
      ) {

        counts.rejected =
          count;
      }

    }


    return counts;
  }

}


/* ============================================================
   DEFAULT SERVICE
============================================================ */

const purchaseRequestService =
  new PurchaseRequestService();


export default
  purchaseRequestService;
