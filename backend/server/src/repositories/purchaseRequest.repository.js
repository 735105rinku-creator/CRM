import PurchaseRequest
  from "../models/PurchaseRequest.js";


/* ============================================================
   HELPERS
============================================================ */

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


const endOfDay =
  (
    value
  ) => {

    const date =
      new Date(
        value
      );


    date.setHours(
      23,
      59,
      59,
      999
    );


    return date;
  };


/* ============================================================
   PURCHASE REQUEST REPOSITORY
============================================================ */

class PurchaseRequestRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return PurchaseRequest
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND BY ID

     Every request is company-scoped.
  ========================================================== */

  async findById({
    companyId,
    purchaseRequestId,
  }) {

    return PurchaseRequest
      .findOne({

        _id:
          purchaseRequestId,

        companyId,

      })
      .lean();
  }


  /* ==========================================================
     FIND BY PR NUMBER
  ========================================================== */

  async findByPrNumber({
    companyId,
    prNumber,
  }) {

    return PurchaseRequest
      .findOne({

        companyId,

        prNumber:
          String(
            prNumber ||
            ""
          )
            .trim()
            .toUpperCase(),

      })
      .lean();
  }


  /* ==========================================================
     LIST PURCHASE REQUESTS
  ========================================================== */

  async list({
    companyId,

    search = "",

    status = "",

    priority = "",

    requestedBy = null,

    departmentId = null,

    from = null,

    to = null,

    requiredFrom = null,

    requiredTo = null,

    page = 1,

    limit = 25,

    sortBy = "requestDate",

    sortOrder = "desc",
  }) {

    const filter = {
      companyId,
    };


    /* --------------------------------------------------------
       STATUS
    -------------------------------------------------------- */

    if (
      status
    ) {

      filter.status =
        status;
    }


    /* --------------------------------------------------------
       PRIORITY
    -------------------------------------------------------- */

    if (
      priority
    ) {

      filter.priority =
        priority;
    }


    /* --------------------------------------------------------
       REQUESTER
    -------------------------------------------------------- */

    if (
      requestedBy
    ) {

      filter.requestedBy =
        requestedBy;
    }


    /* --------------------------------------------------------
       DEPARTMENT
    -------------------------------------------------------- */

    if (
      departmentId
    ) {

      filter.departmentId =
        departmentId;
    }


    /* --------------------------------------------------------
       REQUEST DATE RANGE
    -------------------------------------------------------- */

    if (
      from ||
      to
    ) {

      filter.requestDate =
        {};


      if (
        from
      ) {

        filter.requestDate.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        filter.requestDate.$lte =
          endOfDay(
            to
          );
      }

    }


    /* --------------------------------------------------------
       REQUIRED DATE RANGE
    -------------------------------------------------------- */

    if (
      requiredFrom ||
      requiredTo
    ) {

      filter.requiredDate =
        {};


      if (
        requiredFrom
      ) {

        filter.requiredDate.$gte =
          new Date(
            requiredFrom
          );
      }


      if (
        requiredTo
      ) {

        filter.requiredDate.$lte =
          endOfDay(
            requiredTo
          );
      }

    }


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

    const searchValue =
      String(
        search ||
        ""
      )
        .trim();


    if (
      searchValue
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            searchValue
          ),
          "i"
        );


      filter.$or = [

        {
          prNumber:
            regex,
        },

        {
          itemName:
            regex,
        },

        {
          description:
            regex,
        },

        {
          purpose:
            regex,
        },

        {
          remarks:
            regex,
        },

        {
          requestedByName:
            regex,
        },

        {
          requestedEmployeeCode:
            regex,
        },

        {
          departmentName:
            regex,
        },

        {
          departmentCode:
            regex,
        },

        {
          unit:
            regex,
        },

      ];

    }


    /* --------------------------------------------------------
       SAFE SORTING
    -------------------------------------------------------- */

    const allowedSortFields =
      new Set([
        "prNumber",
        "requestDate",
        "requiredDate",
        "priority",
        "status",
        "itemName",
        "createdAt",
        "updatedAt",
      ]);


    const safeSortBy =
      allowedSortFields
        .has(
          sortBy
        )
        ? sortBy
        : "requestDate";


    const direction =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    /* --------------------------------------------------------
       SAFE PAGINATION
    -------------------------------------------------------- */

    const safePage =
      Math.max(
        Number(
          page ||
          1
        ),
        1
      );


    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit ||
            25
          ),
          1
        ),
        200
      );


    const skip =
      (
        safePage -
        1
      ) *
      safeLimit;


    const [
      rows,
      total,
    ] =
      await Promise.all([

        PurchaseRequest
          .find(
            filter
          )
          .sort({

            [safeSortBy]:
              direction,

            createdAt:
              direction,

          })
          .skip(
            skip
          )
          .limit(
            safeLimit
          )
          .lean(),


        PurchaseRequest
          .countDocuments(
            filter
          ),

      ]);


    const pages =
      Math.max(
        Math.ceil(
          total /
          safeLimit
        ),
        1
      );


    return {

      rows,

      pagination: {

        total,

        page:
          safePage,

        limit:
          safeLimit,

        pages,

      },

    };
  }


  /* ==========================================================
     UPDATE EDITABLE PURCHASE REQUEST

     Current rule:
       draft → editable

     Submitted / Approved / Rejected requests cannot be modified
     through the normal edit endpoint.
  ========================================================== */

  async updateDraftById({
    companyId,
    purchaseRequestId,
    payload,
  }) {

    return PurchaseRequest
      .findOneAndUpdate(

        {
          _id:
            purchaseRequestId,

          companyId,

          status:
            "draft",
        },

        {
          $set:
            payload,
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     SUBMIT FOR APPROVAL

     Atomic transition:

       draft → pending_approval

     Concurrent duplicate submit requests cannot both pass the
     status=draft condition.
  ========================================================== */

  async submitById({
    companyId,
    purchaseRequestId,
    userId = null,
    remarks = "",
    submittedAt = new Date(),
  }) {

    const update = {

      status:
        "pending_approval",

      submittedBy:
        userId,

      submittedAt,

      updatedBy:
        userId,

    };


    const cleanRemarks =
      String(
        remarks ||
        ""
      )
        .trim();


    if (
      cleanRemarks
    ) {

      update.remarks =
        cleanRemarks;
    }


    return PurchaseRequest
      .findOneAndUpdate(

        {
          _id:
            purchaseRequestId,

          companyId,

          status:
            "draft",
        },

        {
          $set:
            update,
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     APPROVE

     Atomic transition:

       pending_approval → approved
  ========================================================== */

  async approveById({
    companyId,
    purchaseRequestId,
    userId = null,
    remarks = "",
    approvedAt = new Date(),
  }) {

    return PurchaseRequest
      .findOneAndUpdate(

        {
          _id:
            purchaseRequestId,

          companyId,

          status:
            "pending_approval",
        },

        {
          $set: {

            status:
              "approved",

            approvedBy:
              userId,

            approvedAt,

            approvalRemarks:
              String(
                remarks ||
                ""
              )
                .trim(),

            updatedBy:
              userId,

            /*
             * Clear rejection audit defensively in case this
             * document originated from older/manual data.
             */
            rejectedBy:
              null,

            rejectedAt:
              null,

            rejectionReason:
              "",

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     REJECT

     Atomic transition:

       pending_approval → rejected
  ========================================================== */

  async rejectById({
    companyId,
    purchaseRequestId,
    userId = null,
    rejectionReason,
    rejectedAt = new Date(),
  }) {

    return PurchaseRequest
      .findOneAndUpdate(

        {
          _id:
            purchaseRequestId,

          companyId,

          status:
            "pending_approval",
        },

        {
          $set: {

            status:
              "rejected",

            rejectedBy:
              userId,

            rejectedAt,

            rejectionReason:
              String(
                rejectionReason ||
                ""
              )
                .trim(),

            updatedBy:
              userId,

            /*
             * Approval audit must remain empty for a rejected
             * Purchase Request.
             */
            approvedBy:
              null,

            approvedAt:
              null,

            approvalRemarks:
              "",

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     GENERIC STATUS TRANSITION SUPPORT

     This method is intentionally restrictive.

     The service decides whether the requested transition is
     valid, then supplies both expected current status and the
     target status.

     This prevents unrestricted direct status mutation.
  ========================================================== */

  async transitionStatusById({
    companyId,
    purchaseRequestId,

    currentStatus,

    nextStatus,

    userId = null,

    extraSet = {},
  }) {

    return PurchaseRequest
      .findOneAndUpdate(

        {
          _id:
            purchaseRequestId,

          companyId,

          status:
            currentStatus,
        },

        {
          $set: {

            status:
              nextStatus,

            updatedBy:
              userId,

            ...extraSet,

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     DASHBOARD / SUMMARY FOUNDATION

     Kept company-scoped so this can later feed the Purchase
     Dashboard without exposing another company's records.
  ========================================================== */

  async countByStatus({
    companyId,
  }) {

    return PurchaseRequest
      .aggregate([

        {
          $match: {
            companyId:
              companyId,
          },
        },

        {
          $group: {

            _id:
              "$status",

            count: {
              $sum:
                1,
            },

          },
        },

        {
          $sort: {
            _id:
              1,
          },
        },

      ]);
  }


  /* ==========================================================
     NO PHYSICAL DELETE

     Purchase Request history should remain traceable.
     No delete method is intentionally exposed here.
  ========================================================== */

}


/* ============================================================
   DEFAULT REPOSITORY
============================================================ */

export const purchaseRequestRepository =
  new PurchaseRequestRepository();


export default
  purchaseRequestRepository;