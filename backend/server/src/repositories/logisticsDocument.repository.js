import mongoose from "mongoose";

import LogisticsDocument
  from "../models/LogisticsDocument.js";


/* ============================================================
   POPULATION
============================================================ */

function populateUploaderDetails(
  query
) {
  return query
    .populate(
      "uploadedBy",
      "name displayName firstName lastName email"
    )
    .populate(
      "uploadedByEmployeeId",
      "employeeCode firstName lastName name displayName designation organizationRole"
    );
}


class LogisticsDocumentRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {
    return LogisticsDocument.create(
      payload
    );
  }


  /* ==========================================================
     FIND BY ID
  ========================================================== */

  async findById({
    documentId,
    companyId,
    includeInactive = false,
  }) {

    const filter = {
      _id:
        documentId,

      companyId,
    };


    if (
      !includeInactive
    ) {

      filter.isActive = {
        $ne:
          false,
      };
    }


    const query =
      LogisticsDocument
        .findOne(
          filter
        );


    return populateUploaderDetails(
      query
    )
      .lean();
  }


  /* ==========================================================
     FIND BY DOCUMENT NUMBER
  ========================================================== */

  async findByDocumentNumber({
    documentNumber,
    companyId,
  }) {

    const query =
      LogisticsDocument
        .findOne({
          companyId,

          documentNumber:
            String(
              documentNumber ||
              ""
            )
              .trim()
              .toUpperCase(),

          isActive: {
            $ne:
              false,
          },
        });


    return populateUploaderDetails(
      query
    )
      .lean();
  }


  /* ==========================================================
     DOCUMENT NUMBER EXISTS
  ========================================================== */

  async documentNumberExists({
    companyId,
    documentNumber,
    excludeId = null,
  }) {

    const filter = {
      companyId,

      documentNumber:
        String(
          documentNumber ||
          ""
        )
          .trim()
          .toUpperCase(),

      isActive: {
        $ne:
          false,
      },
    };


    if (
      excludeId
    ) {

      filter._id = {
        $ne:
          excludeId,
      };
    }


    return LogisticsDocument
      .exists(
        filter
      );
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async paginate({
    companyId,

    page = 1,
    limit = 20,

    search = "",

    shipmentId = null,
    shipmentNo = "",

    documentType = "",
    status = "",

    fromDate = null,
    toDate = null,

    sortBy = "createdAt",
    sortOrder = "desc",
  }) {

    const filter =
      this.buildFilter({
        companyId,

        search,

        shipmentId,
        shipmentNo,

        documentType,
        status,

        fromDate,
        toDate,
      });


    const safePage =
      Math.max(
        Number(page) || 1,
        1
      );


    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      );


    const skip =
      (
        safePage -
        1
      ) *
      safeLimit;


    const allowedSortFields =
      new Set([
        "createdAt",
        "updatedAt",
        "documentNumber",
        "expiryDate",
        "status",
      ]);


    const safeSortBy =
      allowedSortFields
        .has(
          sortBy
        )
        ? sortBy
        : "createdAt";


    const direction =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    const listQuery =
      LogisticsDocument
        .find(
          filter
        );


    populateUploaderDetails(
      listQuery
    );


    const [
      data,
      total,
    ] =
      await Promise.all([

        listQuery
          .sort({
            [safeSortBy]:
              direction,
          })
          .skip(
            skip
          )
          .limit(
            safeLimit
          )
          .lean(),


        LogisticsDocument
          .countDocuments(
            filter
          ),
      ]);


    const totalPages =
      Math.max(
        Math.ceil(
          total /
          safeLimit
        ),
        1
      );


    return {
      data,

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages,

        hasNextPage:
          safePage <
          totalPages,

        hasPreviousPage:
          safePage >
          1,
      },
    };
  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateById({
    documentId,
    companyId,
    payload,
  }) {

    const query =
      LogisticsDocument
        .findOneAndUpdate(
          {
            _id:
              documentId,

            companyId,

            isActive: {
              $ne:
                false,
            },
          },

          {
            $set:
              payload,
          },

          {
            new:
              true,

            runValidators:
              true,
          }
        );


    return populateUploaderDetails(
      query
    )
      .lean();
  }


  /* ==========================================================
     SOFT DELETE
  ========================================================== */

  async softDelete({
    documentId,
    companyId,
    updatedBy = null,
  }) {

    return LogisticsDocument
      .findOneAndUpdate(
        {
          _id:
            documentId,

          companyId,

          isActive: {
            $ne:
              false,
          },
        },

        {
          $set: {
            isActive:
              false,

            updatedBy,
          },
        },

        {
          new:
            true,
        }
      )
      .lean();
  }


  /* ==========================================================
     EXPIRED DOCUMENTS
  ========================================================== */

  async markExpired({
    companyId,
  }) {

    const now =
      new Date();


    return LogisticsDocument
      .updateMany(
        {
          companyId,

          isActive: {
            $ne:
              false,
          },

          expiryDate: {
            $ne:
              null,

            $lt:
              now,
          },

          status: {
            $nin: [
              "expired",
              "rejected",
            ],
          },
        },

        {
          $set: {
            status:
              "expired",
          },
        }
      );
  }


  /* ==========================================================
     SUMMARY
  ========================================================== */

  async summary(
    companyId
  ) {

    const companyObjectId =
      new mongoose
        .Types
        .ObjectId(
          String(
            companyId
          )
        );


    const result =
      await LogisticsDocument.aggregate([
        {
          $match: {
            companyId:
              companyObjectId,

            isActive: {
              $ne:
                false,
            },
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


    return result;
  }


  /* ==========================================================
     LATEST DOCUMENT NUMBER
  ========================================================== */

  async findLatestDocumentNumber({
    companyId,
    dateCode,
  }) {

    const regex =
      new RegExp(
        `^DOC-${dateCode}-`,
        "i"
      );


    return LogisticsDocument
      .findOne({
        companyId,

        documentNumber: {
          $regex:
            regex,
        },
      })
      .sort({
        documentNumber:
          -1,
      })
      .select(
        "documentNumber"
      )
      .lean();
  }


  /* ==========================================================
     BUILD FILTER
  ========================================================== */

  buildFilter({
    companyId,

    search = "",

    shipmentId = null,
    shipmentNo = "",

    documentType = "",
    status = "",

    fromDate = null,
    toDate = null,
  }) {

    const filter = {
      companyId,

      isActive: {
        $ne:
          false,
      },
    };


    if (
      shipmentId
    ) {

      filter.shipmentId =
        shipmentId;
    }


    if (
      shipmentNo
    ) {

      filter.shipmentNumber =
        String(
          shipmentNo
        )
          .trim()
          .toUpperCase();
    }


    if (
      documentType
    ) {

      filter.documentType =
        documentType;
    }


    if (
      status
    ) {

      filter.status =
        status;
    }


    if (
      fromDate ||
      toDate
    ) {

      filter.createdAt = {};


      if (
        fromDate
      ) {

        filter.createdAt.$gte =
          new Date(
            fromDate
          );
      }


      if (
        toDate
      ) {

        const end =
          new Date(
            toDate
          );

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte =
          end;
      }
    }


    const normalizedSearch =
      String(
        search ||
        ""
      )
        .trim();


    if (
      normalizedSearch
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            normalizedSearch
          ),
          "i"
        );


      filter.$or = [

        {
          documentNumber:
            regex,
        },

        {
          shipmentNumber:
            regex,
        },

        {
          customerName:
            regex,
        },

        {
          documentTitle:
            regex,
        },

        {
          fileName:
            regex,
        },

        {
          originalFileName:
            regex,
        },

        {
          referenceNumber:
            regex,
        },

        {
          issuingAuthority:
            regex,
        },

      ];
    }


    return filter;
  }
}


function escapeRegex(
  value
) {

  return String(
    value
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


export const
  logisticsDocumentRepository =
    new LogisticsDocumentRepository();


export default
  logisticsDocumentRepository;