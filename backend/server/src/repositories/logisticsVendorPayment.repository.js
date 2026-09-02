import LogisticsVendorPayment
  from "../models/LogisticsVendorPayment.js";

class LogisticsVendorPaymentRepository {
  async create(payload) {
    return LogisticsVendorPayment.create(payload);
  }

  async findById({
    companyId,
    paymentId,
  }) {
    return LogisticsVendorPayment
      .findOne({
        _id: paymentId,
        companyId,
        isActive: true,
      })
      .populate(
        "vendorId",
        "vendorCode vendorName companyName mobile email"
      )
      .populate(
        "shipmentId",
        "shipmentNumber shipmentMode customerName status"
      )
      .lean();
  }

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    vendorId = null,
    status = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  }) {
    const filter = {
      companyId,
      isActive: true,
    };

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.invoiceDate = {};

      if (fromDate) {
        filter.invoiceDate.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        const end =
          new Date(toDate);

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.invoiceDate.$lte =
          end;
      }
    }

    const q =
      String(search || "").trim();

    if (q) {
      const regex =
        new RegExp(
          escapeRegex(q),
          "i"
        );

      filter.$or = [
        { paymentCode: regex },
        { vendor: regex },
        { exportInvoiceNo: regex },
        { vendorInvoiceNo: regex },
        { from: regex },
        { shipmentNumber: regex },
        { remarks: regex },
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
        100
      );

    const allowedSort =
      new Set([
        "createdAt",
        "updatedAt",
        "paymentCode",
        "invoiceDate",
        "vendorInvoiceDate",
        "totalAmount",
        "pendingAmount",
        "supplierBalance",
        "status",
      ]);

    const field =
      allowedSort.has(sortBy)
        ? sortBy
        : "createdAt";

    const direction =
      sortOrder === "asc"
        ? 1
        : -1;

    const [data, total] =
      await Promise.all([
        LogisticsVendorPayment
          .find(filter)
          .populate(
            "vendorId",
            "vendorCode vendorName companyName"
          )
          .sort({
            [field]:
              direction,
          })
          .skip(
            (safePage - 1) *
            safeLimit
          )
          .limit(safeLimit)
          .lean(),

        LogisticsVendorPayment
          .countDocuments(filter),
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
        page: safePage,
        limit: safeLimit,
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
    paymentId,
    payload,
  }) {
    return LogisticsVendorPayment
      .findOneAndUpdate(
        {
          _id: paymentId,
          companyId,
          isActive: true,
        },
        {
          $set:
            payload,
        },
        {
          new: true,
          runValidators: true,
        }
      );
  }

  async addPaymentTransaction({
    companyId,
    paymentId,
    transaction,
    amount,
    userId,
  }) {
    return LogisticsVendorPayment
      .findOneAndUpdate(
        {
          _id: paymentId,
          companyId,
          isActive: true,
        },
        {
          $push: {
            paymentHistory:
              transaction,
          },

          $inc: {
            paidAmount:
              Number(amount || 0),
          },

          $set: {
            updatedBy:
              userId,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
  }

  async softDelete({
    companyId,
    paymentId,
    userId,
  }) {
    return LogisticsVendorPayment
      .findOneAndUpdate(
        {
          _id: paymentId,
          companyId,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            updatedBy: userId,
          },
        },
        {
          new: true,
        }
      )
      .lean();
  }

  async summary(companyId) {
    return LogisticsVendorPayment.aggregate([
      {
        $match: {
          companyId,
          isActive: true,
        },
      },

      {
        $group: {
          _id: "$status",

          count: {
            $sum: 1,
          },

          totalAmount: {
            $sum: "$totalAmount",
          },

          previousAdvance: {
            $sum: "$previousAdvance",
          },

          paidAmount: {
            $sum: "$paidAmount",
          },

          deduction: {
            $sum: "$deduction",
          },

          pendingAmount: {
            $sum: "$pendingAmount",
          },

          supplierBalance: {
            $sum: "$supplierBalance",
          },
        },
      },
    ]);
  }

  async nextSerialNumber(
    companyId
  ) {
    const latest =
      await LogisticsVendorPayment
        .findOne({
          companyId,
          isActive: true,
        })
        .sort({
          serialNumber: -1,
        })
        .select(
          "serialNumber"
        )
        .lean();

    return Number(
      latest?.serialNumber || 0
    ) + 1;
  }

  async latestCode({
    companyId,
    dateCode,
  }) {
    return LogisticsVendorPayment
      .findOne({
        companyId,

        paymentCode: {
          $regex:
            new RegExp(
              `^VPM-${dateCode}-`,
              "i"
            ),
        },
      })
      .sort({
        paymentCode:
          -1,
      })
      .select(
        "paymentCode"
      )
      .lean();
  }

  async codeExists({
    companyId,
    paymentCode,
  }) {
    return LogisticsVendorPayment
      .exists({
        companyId,
        paymentCode,
      });
  }
}

function escapeRegex(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

export const
  logisticsVendorPaymentRepository =
    new LogisticsVendorPaymentRepository();

export default
  logisticsVendorPaymentRepository;
