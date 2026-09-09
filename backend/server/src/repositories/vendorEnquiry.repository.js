import mongoose from "mongoose";

import VendorEnquiry from "../models/VendorEnquiry.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex = (value = "") =>
  String(value)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


const toObjectId = (value) => {

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    return new mongoose.Types.ObjectId(
      value
    );
  }

  return value;
};


const normalizePage = (
  value,
  fallback = 1
) => {

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <
      1
  ) {
    return fallback;
  }

  return Math.floor(parsed);
};


const normalizeLimit = (
  value,
  fallback = 25
) => {

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <
      1
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsed),
    200
  );
};


/* ============================================================
   REPOSITORY
============================================================ */

class VendorEnquiryRepository {

  constructor(
    model =
      VendorEnquiry
  ) {

    this.model =
      model;
  }


  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return this.model.create(
      payload
    );
  }


  /* ==========================================================
     FIND BY ID
  ========================================================== */

  async findById({
    companyId,
    vendorEnquiryId,
  }) {

    return this.model
      .findOne({
        _id:
          vendorEnquiryId,

        companyId:
          toObjectId(
            companyId
          ),
      })
      .lean();
  }


  /* ==========================================================
     FIND BY ENQUIRY NUMBER
  ========================================================== */

  async findByEnquiryNumber({
    companyId,
    enquiryNumber,
  }) {

    return this.model
      .findOne({
        companyId:
          toObjectId(
            companyId
          ),

        enquiryNumber:
          String(
            enquiryNumber ||
            ""
          )
            .trim()
            .toUpperCase(),
      })
      .lean();
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list({
    companyId,
    search,
    status,
    source,
    vendorId,
    purchaseRequestId,
    from,
    to,
    page = 1,
    limit = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {

    const safePage =
      normalizePage(
        page
      );

    const safeLimit =
      normalizeLimit(
        limit
      );


    const filter = {
      companyId:
        toObjectId(
          companyId
        ),
    };


    if (
      status
    ) {

      filter.status =
        String(
          status
        )
          .trim()
          .toLowerCase();
    }


    if (
      source
    ) {

      filter.source =
        String(
          source
        )
          .trim()
          .toLowerCase();
    }


    if (
      vendorId
    ) {

      filter.vendorId =
        toObjectId(
          vendorId
        );
    }


    if (
      purchaseRequestId
    ) {

      filter.purchaseRequestId =
        toObjectId(
          purchaseRequestId
        );
    }


    if (
      from ||
      to
    ) {

      filter.createdAt =
        {};

      if (
        from
      ) {

        filter.createdAt.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        const endDate =
          new Date(
            to
          );

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          endDate;
      }
    }


    if (
      search
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            String(
              search
            ).trim()
          ),
          "i"
        );

      filter.$or = [
        {
          enquiryNumber:
            regex,
        },
        {
          rfqNumber:
            regex,
        },
        {
          vendorName:
            regex,
        },
        {
          vendorCode:
            regex,
        },
        {
          contactPerson:
            regex,
        },
        {
          phone:
            regex,
        },
        {
          email:
            regex,
        },
        {
          itemName:
            regex,
        },
        {
          otherSource:
            regex,
        },
      ];
    }


    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "enquiryNumber",
        "status",
        "vendorName",
        "itemName",
      ]);


    const safeSortBy =
      allowedSortFields.has(
        sortBy
      )
        ? sortBy
        : "createdAt";


    const safeSortOrder =
      String(
        sortOrder
      ).toLowerCase() ===
      "asc"
        ? 1
        : -1;


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

        this.model
          .find(
            filter
          )
          .sort({
            [safeSortBy]:
              safeSortOrder,

            _id:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            safeLimit
          )
          .lean(),

        this.model
          .countDocuments(
            filter
          ),

      ]);


    return {
      rows,

      pagination: {
        total,

        page:
          safePage,

        limit:
          safeLimit,

        pages:
          Math.max(
            1,
            Math.ceil(
              total /
              safeLimit
            )
          ),
      },
    };
  }


  /* ==========================================================
     UPDATE DRAFT
  ========================================================== */

  async updateDraftById({
    companyId,
    vendorEnquiryId,
    update,
  }) {

    return this.model
      .findOneAndUpdate(
        {
          _id:
            vendorEnquiryId,

          companyId:
            toObjectId(
              companyId
            ),

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
     DRAFT -> REQUESTED
  ========================================================== */

  async requestById({
    companyId,
    vendorEnquiryId,
    userId,
    remarks,
  }) {

    const update = {
      status:
        "requested",

      requestedAt:
        new Date(),

      requestedBy:
        userId ||
        null,

      updatedBy:
        userId ||
        null,
    };


    if (
      remarks !==
      undefined
    ) {

      update.remarks =
        remarks;
    }


    return this.model
      .findOneAndUpdate(
        {
          _id:
            vendorEnquiryId,

          companyId:
            toObjectId(
              companyId
            ),

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
     REQUESTED -> RECEIVED
  ========================================================== */

  async receiveById({
    companyId,
    vendorEnquiryId,
    userId,
    quotationData,
  }) {

    return this.model
      .findOneAndUpdate(
        {
          _id:
            vendorEnquiryId,

          companyId:
            toObjectId(
              companyId
            ),

          status:
            "requested",
        },
        {
          $set: {
            ...quotationData,

            status:
              "received",

            receivedAt:
              new Date(),

            receivedBy:
              userId ||
              null,

            updatedBy:
              userId ||
              null,
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
     CONTROLLED STATUS TRANSITION
  ========================================================== */

  async transitionStatusById({
    companyId,
    vendorEnquiryId,
    currentStatus,
    nextStatus,
    userId,
    remarks,
  }) {

    const update = {
      status:
        nextStatus,

      updatedBy:
        userId ||
        null,
    };


    if (
      remarks !==
      undefined
    ) {

      update.remarks =
        remarks;
    }


    return this.model
      .findOneAndUpdate(
        {
          _id:
            vendorEnquiryId,

          companyId:
            toObjectId(
              companyId
            ),

          status:
            currentStatus,
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
     COUNT BY STATUS
  ========================================================== */

  async countByStatus({
    companyId,
  }) {

    return this.model.aggregate([
      {
        $match: {
          companyId:
            toObjectId(
              companyId
            ),
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
    ]);
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const vendorEnquiryRepository =
  new VendorEnquiryRepository();


export {
  VendorEnquiryRepository
};


export default
  vendorEnquiryRepository;