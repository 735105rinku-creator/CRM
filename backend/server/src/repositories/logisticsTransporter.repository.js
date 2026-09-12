import LogisticsTransporter
  from "../models/LogisticsTransporter.js";


/* ============================================================
   CREATOR DETAILS

   Preferred:
   createdByEmployeeId -> Employee

   Legacy fallback:
   createdBy -> User

   This only enriches read responses.
   Existing Transporter permissions/CRUD are unchanged.
============================================================ */

function populateCreatorDetails(query) {

  return query
    .populate(
      "createdBy",
      "name displayName firstName lastName email"
    )
    .populate(
      "createdByEmployeeId",
      "employeeCode firstName lastName name displayName designation organizationRole"
    );
}


class LogisticsTransporterRepository {


  /* ============================================================
     CREATE
  ============================================================ */

  async create(payload) {

    return LogisticsTransporter.create(
      payload
    );
  }


  /* ============================================================
     FIND BY ID
  ============================================================ */

  async findById({
    companyId,
    transporterId,
  }) {

    const query =
      LogisticsTransporter.findOne({

        _id:
          transporterId,

        companyId,

        isActive: {
          $ne:
            false,
        },

      });


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ============================================================
     PAGINATION / LIST
  ============================================================ */

  async paginate({

    companyId,

    page = 1,

    limit = 20,

    search = "",

    status = "",

    serviceType = "",

    fromDate = null,

    toDate = null,

    sortBy = "createdAt",

    sortOrder = "desc",

  }) {

    const filter = {

      companyId,

      isActive: {
        $ne:
          false,
      },

    };


    /* ----------------------------------------------------------
       STATUS
    ---------------------------------------------------------- */

    if (
      status
    ) {

      filter.status =
        status;
    }


    /* ----------------------------------------------------------
       SERVICE TYPE
    ---------------------------------------------------------- */

    if (
      serviceType
    ) {

      filter.serviceType =
        serviceType;
    }


    /* ----------------------------------------------------------
       DATE RANGE
    ---------------------------------------------------------- */

    applyCreatedAtRange(
      filter,
      fromDate,
      toDate
    );


    /* ----------------------------------------------------------
       SEARCH
    ---------------------------------------------------------- */

    const q =
      String(
        search ||
        ""
      )
        .trim();


    if (
      q
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            q
          ),
          "i"
        );


      filter.$or = [

        {
          transporterCode:
            regex,
        },

        {
          transporterName:
            regex,
        },

        {
          contactPerson:
            regex,
        },

        {
          mobile:
            regex,
        },

        {
          email:
            regex,
        },

        {
          gstNumber:
            regex,
        },

        {
          panNumber:
            regex,
        },

        {
          city:
            regex,
        },

        {
          state:
            regex,
        },

        {
          defaultDriverName:
            regex,
        },

        {
          defaultVehicleNumber:
            regex,
        },

      ];
    }


    /* ----------------------------------------------------------
       SAFE PAGINATION
    ---------------------------------------------------------- */

    const safePage =
      Math.max(
        Number(
          page
        ) ||
        1,
        1
      );


    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
          20,
          1
        ),
        100
      );


    /* ----------------------------------------------------------
       SAFE SORT
    ---------------------------------------------------------- */

    const allowedSort =
      new Set([

        "createdAt",

        "updatedAt",

        "transporterCode",

        "transporterName",

        "status",

      ]);


    const field =
      allowedSort.has(
        sortBy
      )

        ? sortBy

        : "createdAt";


    const direction =
      sortOrder === "asc"
        ? 1
        : -1;


    /* ----------------------------------------------------------
       DATA QUERY
    ---------------------------------------------------------- */

    const dataQuery =
      LogisticsTransporter
        .find(
          filter
        )
        .sort({

          [field]:
            direction,

        })
        .skip(
          (
            safePage -
            1
          ) *
          safeLimit
        )
        .limit(
          safeLimit
        );


    populateCreatorDetails(
      dataQuery
    );


    const [
      data,
      total,
    ] =
      await Promise.all([

        dataQuery
          .lean(),

        LogisticsTransporter
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


  /* ============================================================
     UPDATE BY ID
  ============================================================ */

  async updateById({

    companyId,

    transporterId,

    payload,

  }) {

    return LogisticsTransporter
      .findOneAndUpdate(

        {

          _id:
            transporterId,

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

      )
      .lean();
  }


  /* ============================================================
     SOFT DELETE
  ============================================================ */

  async softDelete({

    companyId,

    transporterId,

    userId,

  }) {

    return LogisticsTransporter
      .findOneAndUpdate(

        {

          _id:
            transporterId,

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

            updatedBy:
              userId,

          },
        },

        {
          new:
            true,
        }

      )
      .lean();
  }


  /* ============================================================
     SUMMARY
  ============================================================ */

  async summary(companyId) {

    return LogisticsTransporter
      .aggregate([

        {

          $match: {

            companyId,

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
  }


  /* ============================================================
     LATEST TRANSPORTER CODE
  ============================================================ */

  async latestCode({

    companyId,

    dateCode,

  }) {

    return LogisticsTransporter
      .findOne({

        companyId,

        transporterCode: {

          $regex:
            new RegExp(
              `^TRN-${dateCode}-`,
              "i"
            ),

        },

      })
      .sort({

        transporterCode:
          -1,

      })
      .select(
        "transporterCode"
      )
      .lean();
  }


  /* ============================================================
     CODE EXISTS
  ============================================================ */

  async codeExists({

    companyId,

    transporterCode,

  }) {

    return LogisticsTransporter
      .exists({

        companyId,

        transporterCode,

      });
  }
}


/* ============================================================
   ESCAPE REGEX
============================================================ */

function escapeRegex(value) {

  return String(
    value
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


/* ============================================================
   DATE RANGE
============================================================ */

function applyCreatedAtRange(
  filter,
  fromDate,
  toDate
) {

  if (
    !fromDate &&
    !toDate
  ) {

    return;
  }


  filter.createdAt =
    {};


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


/* ============================================================
   EXPORT
============================================================ */

export const logisticsTransporterRepository =
  new LogisticsTransporterRepository();


export default logisticsTransporterRepository;