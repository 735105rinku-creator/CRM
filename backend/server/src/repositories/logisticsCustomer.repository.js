import LogisticsCustomer
  from "../models/LogisticsCustomer.js";

class LogisticsCustomerRepository {
  async create(payload) {
    return LogisticsCustomer.create(
      payload
    );
  }

  async findById({
    companyId,
    customerId,
  }) {
    return LogisticsCustomer
      .findOne({
        _id:
          customerId,

        companyId,

        isActive:
          true,
      })
      .lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    customerType = "",
    status = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,

      isActive:
        true,
    };

    if (customerType) {
      filter.customerType =
        customerType;
    }

    if (status) {
      filter.status =
        status;
    }

    applyCreatedAtRange(filter, fromDate, toDate);

    const q =
      String(search || "")
        .trim();

    if (q) {
      const regex =
        new RegExp(
          escapeRegex(q),
          "i"
        );

      filter.$or = [
        {
          customerCode:
            regex,
        },

        {
          customerName:
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
          "billingAddress.city":
            regex,
        },

        {
          "billingAddress.state":
            regex,
        },
      ];
    }

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
        500
      );

    const allowedSort =
      new Set([
        "createdAt",
        "updatedAt",
        "customerCode",
        "customerName",
        "status",
        "creditLimit",
      ]);

    const safeSortBy =
      allowedSort.has(sortBy)
        ? sortBy
        : "createdAt";

    const direction =
      sortOrder === "asc"
        ? 1
        : -1;

    const [
      data,
      total,
    ] =
      await Promise.all([
        LogisticsCustomer
          .find(filter)
          .sort({
            [safeSortBy]:
              direction,
          })
          .skip(
            (safePage - 1) *
            safeLimit
          )
          .limit(
            safeLimit
          )
          .lean(),

        LogisticsCustomer
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

  async updateById({
    companyId,
    customerId,
    payload,
  }) {
    return LogisticsCustomer
      .findOneAndUpdate(
        {
          _id:
            customerId,

          companyId,

          isActive:
            true,
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

  async softDelete({
    companyId,
    customerId,
    userId,
  }) {
    return LogisticsCustomer
      .findOneAndUpdate(
        {
          _id:
            customerId,

          companyId,

          isActive:
            true,
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

  async summary(
    companyId
  ) {
    return LogisticsCustomer.aggregate([
      {
        $match: {
          companyId,

          isActive:
            true,
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

          creditLimit: {
            $sum:
              "$creditLimit",
          },

          openingBalance: {
            $sum:
              "$openingBalance",
          },
        },
      },
    ]);
  }

  async latestCode({
    companyId,
    dateCode,
  }) {
    return LogisticsCustomer
      .findOne({
        companyId,

        customerCode: {
          $regex:
            new RegExp(
              `^CUS-${dateCode}-`,
              "i"
            ),
        },
      })
      .sort({
        customerCode:
          -1,
      })
      .select(
        "customerCode"
      )
      .lean();
  }

  async codeExists({
    companyId,
    customerCode,
  }) {
    return LogisticsCustomer
      .exists({
        companyId,

        customerCode,
      });
  }
}

function escapeRegex(
  value
) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

function applyCreatedAtRange(filter, fromDate, toDate) {
  if (!fromDate && !toDate) return;
  filter.createdAt = {};
  if (fromDate) filter.createdAt.$gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    filter.createdAt.$lte = end;
  }
}

export const
  logisticsCustomerRepository =
    new LogisticsCustomerRepository();

export default
  logisticsCustomerRepository;
