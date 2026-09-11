import LogisticsVendor
  from "../models/LogisticsVendor.js";


class LogisticsVendorRepository {


  /* ============================================================
     CREATE
  ============================================================ */

  async create(
    payload
  ) {

    return LogisticsVendor.create(
      payload
    );
  }


  async findDuplicate({ companyId, vendorName, gstNumber, panNumber }) {

    const matches = [];

    if (String(gstNumber || "").trim()) matches.push({ gstNumber: String(gstNumber).trim().toUpperCase() });
    if (String(panNumber || "").trim()) matches.push({ panNumber: String(panNumber).trim().toUpperCase() });
    if (String(vendorName || "").trim()) matches.push({ vendorName: new RegExp(`^${escapeRegex(String(vendorName).trim())}$`, "i") });

    if (!matches.length) return null;

    return LogisticsVendor.findOne({
      companyId,
      isActive: { $ne: false },
      $or: matches,
    }).select("_id vendorCode vendorName gstNumber panNumber").lean();
  }


  /* ============================================================
     FIND BY ID

     Backward compatible:
     - isActive true -> available
     - isActive missing -> available
     - isActive false -> soft deleted
  ============================================================ */

  async findById({
    companyId,
    vendorId,
  }) {

    return LogisticsVendor
      .findOne({
        _id:
          vendorId,

        companyId,

        isActive: {
          $ne:
            false,
        },
      })
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

    vendorType = "",

    serviceCategory = "",

    status = "",

    fromDate = null,

    toDate = null,

    sortBy = "createdAt",

    sortOrder = "desc",

  }) {

    /*
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * isActive: true
     *
     * because older Vendor records may not contain
     * the isActive field.
     *
     * $ne:false keeps old records visible while still
     * excluding records explicitly soft deleted.
     */
    const filter = {

      companyId,

      isActive: {
        $ne:
          false,
      },
    };


    /* ----------------------------------------------------------
       VENDOR TYPE
    ---------------------------------------------------------- */

    if (
      vendorType
    ) {

      filter.vendorType =
        vendorType;
    }


    /* ----------------------------------------------------------
       SERVICE CATEGORY
    ---------------------------------------------------------- */

    if (
      serviceCategory
    ) {

      filter.serviceCategory =
        normalizeCategory(
          serviceCategory
        );
    }


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
          vendorCode:
            regex,
        },

        {
          vendorName:
            regex,
        },

        {
          companyName:
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
          iecNumber:
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

        {
          productsServices:
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

    const allowed =
      new Set([
        "createdAt",
        "updatedAt",
        "vendorCode",
        "vendorName",
        "status",
        "openingPayable",
        "creditDays",
      ]);


    const safeSortBy =
      allowed.has(
        sortBy
      )

        ? sortBy

        : "createdAt";


    const direction =
      sortOrder ===
        "asc"

        ? 1

        : -1;


    /* ----------------------------------------------------------
       QUERY
    ---------------------------------------------------------- */

    const [
      data,
      total,
    ] =
      await Promise.all([

        LogisticsVendor
          .find(
            filter
          )
          .sort({
            [safeSortBy]:
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
          )
          .lean(),


        LogisticsVendor
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

    vendorId,

    payload,

  }) {

    return LogisticsVendor
      .findOneAndUpdate(

        {

          _id:
            vendorId,

          companyId,

          /*
           * Old active records without isActive
           * must remain editable.
           */
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

    vendorId,

    userId,

  }) {

    return LogisticsVendor
      .findOneAndUpdate(

        {

          _id:
            vendorId,

          companyId,

          /*
           * Can delete old active Vendor that does not yet
           * contain an isActive property.
           */
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

  async summary(
    companyId
  ) {

    return LogisticsVendor
      .aggregate([

        {
          $match: {

            companyId,

            /*
             * Include old valid Vendors.
             * Exclude only explicitly deleted Vendors.
             */
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

            openingPayable: {
              $sum:
                "$openingPayable",
            },
          },
        },

      ]);
  }


  /* ============================================================
     LATEST VENDOR CODE
  ============================================================ */

  async latestCode({

    companyId,

    dateCode,

  }) {

    return LogisticsVendor
      .findOne({

        companyId,

        vendorCode: {

          $regex:
            new RegExp(
              `^VEN-${dateCode}-`,
              "i"
            ),
        },
      })
      .sort({
        vendorCode:
          -1,
      })
      .select(
        "vendorCode"
      )
      .lean();
  }


  /* ============================================================
     CODE EXISTS
  ============================================================ */

  async codeExists({

    companyId,

    vendorCode,

  }) {

    return LogisticsVendor
      .exists({

        companyId,

        vendorCode,
      });
  }
}


/* ============================================================
   ESCAPE REGEX
============================================================ */

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


  filter.createdAt = {};


  if (
    fromDate
  ) {

    const start =
      new Date(
        fromDate
      );


    start.setHours(
      0,
      0,
      0,
      0
    );


    filter.createdAt.$gte =
      start;
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
   CATEGORY NORMALIZATION
============================================================ */

function normalizeCategory(
  value
) {

  return ({

    "air-cargo":
      "air_cargo",

    "sea-freight":
      "sea_freight",

    "road-transport":
      "road_transport",

    "customs-cha":
      "customs_cha",

    "multi-service":
      "multi_service",

  })[
    value
  ] ||
  value;
}


/* ============================================================
   EXPORT
============================================================ */

export const
  logisticsVendorRepository =
    new LogisticsVendorRepository();


export default
  logisticsVendorRepository;
