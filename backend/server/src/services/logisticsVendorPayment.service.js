import mongoose from "mongoose";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import logisticsVendorPaymentRepository
  from "../repositories/logisticsVendorPayment.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class LogisticsVendorPaymentService {
  async createPaymentRecord({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const vendor =
      await this.resolveVendor({
        companyId,
        vendorId:
          payload.vendorId,
      });

    const shipment =
      await this.resolveShipment({
        companyId,
        shipmentId:
          payload.shipmentId,
        shipmentNumber:
          payload.shipmentNumber,
      });

    const paymentCode =
      await this.generatePaymentCode({
        companyId,
      });

    const serialNumber =
      await logisticsVendorPaymentRepository
        .nextSerialNumber(
          companyId
        );

    const amounts =
      calculateAmounts({
        totalAmount:
          payload.totalAmount,
        previousAdvance:
          payload.previousAdvance,
        paidAmount:
          payload.paidAmount,
        deduction:
          payload.deduction,
      });

    const status =
      deriveStatus({
        requestedStatus:
          payload.status,
        ...amounts,
      });

    const paymentHistory = [];

    if (
      Number(payload.paidAmount || 0) >
      0
    ) {
      paymentHistory.push({
        amount:
          Number(payload.paidAmount),

        paymentDate:
          new Date(),

        paymentMode:
          "bank_transfer",

        paymentModeOther:
          "",

        referenceNumber:
          "",

        remarks:
          `Opening paid amount for ${payload.vendorInvoiceNo}`,

        paidBy:
          userId,

        createdAt:
          new Date(),
      });
    }

    return logisticsVendorPaymentRepository
      .create({
        companyId,
        paymentCode,
        serialNumber,

        vendorId:
          vendor._id,

        vendor:
          vendor.vendorName,

        exportInvoiceNo:
          payload.exportInvoiceNo,

        invoiceDate:
          new Date(
            payload.invoiceDate
          ),

        from:
          payload.from,

        vendorInvoiceNo:
          payload.vendorInvoiceNo,

        vendorInvoiceDate:
          new Date(
            payload.vendorInvoiceDate
          ),

        weight:
          Number(payload.weight || 0),

        weightUnit:
          payload.weightUnit || "mt",

        weightUnitOther:
          payload.weightUnit === "other"
            ? payload.weightUnitOther || ""
            : "",

        totalAmount:
          amounts.totalAmount,

        previousAdvance:
          amounts.previousAdvance,

        pendingAmount:
          amounts.pendingAmount,

        paidAmount:
          amounts.paidAmount,

        deduction:
          amounts.deduction,

        supplierBalance:
          amounts.supplierBalance,

        status,

        statusOther:
          status === "other"
            ? payload.statusOther || ""
            : "",

        shipmentId:
          shipment?._id || null,

        shipmentNumber:
          shipment?.shipmentNumber ||
          String(
            payload.shipmentNumber ||
            ""
          )
            .trim()
            .toUpperCase(),

        currency:
          String(
            payload.currency ||
            vendor.currency ||
            "INR"
          )
            .trim()
            .toUpperCase(),

        paymentHistory,

        remarks:
          payload.remarks,

        createdBy:
          userId,

        createdByEmployeeId:
          employeeId,

        updatedBy:
          userId,
      });
  }

  async listPaymentRecords({
    companyId,
    query,
  }) {
    this.assertCompanyId(companyId);

    return logisticsVendorPaymentRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getPaymentRecord({
    companyId,
    paymentId,
  }) {
    this.assertCompanyId(companyId);

    this.assertObjectId(
      paymentId,
      "Invalid Vendor Payment ID"
    );

    const record =
      await logisticsVendorPaymentRepository
        .findById({
          companyId,
          paymentId,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }

    return record;
  }

  async updatePaymentRecord({
    companyId,
    paymentId,
    userId = null,
    payload,
  }) {
    const current =
      await this.getPaymentRecord({
        companyId,
        paymentId,
      });

    const update = {
      ...payload,
      updatedBy:
        userId,
    };

    if (
      payload.vendorId
    ) {
      const vendor =
        await this.resolveVendor({
          companyId,
          vendorId:
            payload.vendorId,
        });

      update.vendorId =
        vendor._id;

      update.vendor =
        vendor.vendorName;
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "shipmentId"
        ) ||
      Object.prototype
        .hasOwnProperty
        .call(
          payload,
          "shipmentNumber"
        )
    ) {
      const shipment =
        await this.resolveShipment({
          companyId,
          shipmentId:
            payload.shipmentId,
          shipmentNumber:
            payload.shipmentNumber,
        });

      update.shipmentId =
        shipment?._id ||
        null;

      update.shipmentNumber =
        shipment?.shipmentNumber ||
        "";
    }

    const monetaryFields = [
      "totalAmount",
      "previousAdvance",
      "paidAmount",
      "deduction",
    ];

    const amountChanged =
      monetaryFields.some(
        (field) =>
          Object.prototype
            .hasOwnProperty
            .call(
              payload,
              field
            )
      );

    if (amountChanged) {
      const amounts =
        calculateAmounts({
          totalAmount:
            payload.totalAmount ??
            current.totalAmount,

          previousAdvance:
            payload.previousAdvance ??
            current.previousAdvance,

          paidAmount:
            payload.paidAmount ??
            current.paidAmount,

          deduction:
            payload.deduction ??
            current.deduction,
        });

      Object.assign(
        update,
        amounts
      );

      update.status =
        deriveStatus({
          requestedStatus:
            payload.status ??
            current.status,
          ...amounts,
        });
    }

    if (
      payload.status &&
      !amountChanged
    ) {
      update.status =
        deriveStatus({
          requestedStatus:
            payload.status,

          totalAmount:
            current.totalAmount,

          previousAdvance:
            current.previousAdvance,

          paidAmount:
            current.paidAmount,

          deduction:
            current.deduction,

          pendingAmount:
            current.pendingAmount,

          supplierBalance:
            current.supplierBalance,
        });
    }

    if (
      update.status !== "other"
    ) {
      update.statusOther = "";
    }

    if (
      payload.weightUnit &&
      payload.weightUnit !== "other"
    ) {
      update.weightUnitOther = "";
    }

    const record =
      await logisticsVendorPaymentRepository
        .updateById({
          companyId,
          paymentId,
          payload:
            update,
        });

    if (!record) {
      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }

    return record;
  }

  async addPayment({
    companyId,
    paymentId,
    userId = null,
    payload,
  }) {
    const current =
      await this.getPaymentRecord({
        companyId,
        paymentId,
      });

    const amount =
      Number(payload.amount || 0);

    if (
      amount >
      Number(
        current.supplierBalance ||
        0
      )
    ) {
      throw new ApiError(
        400,
        "Payment amount cannot exceed Supplier Balance"
      );
    }

    const mode =
      normalizePaymentMode(
        payload.paymentMode
      );

    const record =
      await logisticsVendorPaymentRepository
        .addPaymentTransaction({
          companyId,
          paymentId,

          amount,

          userId,

          transaction: {
            amount,

            paymentDate:
              new Date(
                payload.paymentDate
              ),

            paymentMode:
              mode,

            paymentModeOther:
              mode === "other"
                ? payload.paymentModeOther ||
                  ""
                : "",

            referenceNumber:
              payload.referenceNumber ||
              "",

            remarks:
              payload.remarks,

            paidBy:
              userId,

            createdAt:
              new Date(),
          },
        });

    if (!record) {
      throw new ApiError(
        404,
        "Vendor payment record not found"
      );
    }

    /*
     * save() runs model validation/calculation hook,
     * recalculating Pending Amount, Supplier Balance and Status.
     */
    await record.save();

    return record;
  }

  async deletePaymentRecord({
    companyId,
    paymentId,
    userId = null,
  }) {
    const current =
      await this.getPaymentRecord({
        companyId,
        paymentId,
      });

    await logisticsVendorPaymentRepository
      .softDelete({
        companyId,
        paymentId,
        userId,
      });

    return {
      paymentId:
        current._id,

      paymentCode:
        current.paymentCode,

      deleted:
        true,
    };
  }

  async getSummary({
    companyId,
  }) {
    this.assertCompanyId(companyId);

    const rows =
      await logisticsVendorPaymentRepository
        .summary(
          new mongoose.Types.ObjectId(
            String(companyId)
          )
        );

    const summary = {
      totalRecords:
        0,

      pending:
        0,

      partial:
        0,

      paid:
        0,

      hold:
        0,

      cancelled:
        0,

      other:
        0,

      totalAmount:
        0,

      previousAdvance:
        0,

      paidAmount:
        0,

      deduction:
        0,

      pendingAmount:
        0,

      supplierBalance:
        0,
    };

    for (const row of rows) {
      const count =
        Number(
          row.count ||
          0
        );

      summary.totalRecords +=
        count;

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            summary,
            row._id
          )
      ) {
        summary[
          row._id
        ] =
          count;
      }

      summary.totalAmount +=
        Number(
          row.totalAmount ||
          0
        );

      summary.previousAdvance +=
        Number(
          row.previousAdvance ||
          0
        );

      summary.paidAmount +=
        Number(
          row.paidAmount ||
          0
        );

      summary.deduction +=
        Number(
          row.deduction ||
          0
        );

      summary.pendingAmount +=
        Number(
          row.pendingAmount ||
          0
        );

      summary.supplierBalance +=
        Number(
          row.supplierBalance ||
          0
        );
    }

    return summary;
  }

  async resolveVendor({
    companyId,
    vendorId,
  }) {
    this.assertObjectId(
      vendorId,
      "Invalid vendor ID"
    );

    const vendor =
      await LogisticsVendor
        .findOne({
          _id:
            vendorId,

          companyId,

          isActive:
            true,
        })
        .select(
          "_id vendorCode vendorName currency status"
        )
        .lean();

    if (!vendor) {
      throw new ApiError(
        404,
        "Logistics vendor not found"
      );
    }

    return vendor;
  }

  async resolveShipment({
    companyId,
    shipmentId,
    shipmentNumber,
  }) {
    if (
      !shipmentId &&
      !shipmentNumber
    ) {
      return null;
    }

    const filter = {
      companyId,
      isActive:
        true,
    };

    if (shipmentId) {
      this.assertObjectId(
        shipmentId,
        "Invalid shipment ID"
      );

      filter._id =
        shipmentId;
    } else {
      filter.shipmentNumber =
        String(
          shipmentNumber ||
          ""
        )
          .trim()
          .toUpperCase();
    }

    const shipment =
      await LogisticsShipment
        .findOne(filter)
        .select(
          "_id shipmentNumber shipmentMode customerName status"
        )
        .lean();

    if (!shipment) {
      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }

    return shipment;
  }

  async generatePaymentCode({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await logisticsVendorPaymentRepository
        .latestCode({
          companyId,
          dateCode,
        });

    let next =
      1;

    if (
      latest?.paymentCode
    ) {
      const last =
        Number(
          latest.paymentCode
            .split("-")
            .pop()
        );

      if (
        Number.isFinite(
          last
        )
      ) {
        next =
          last +
          1;
      }
    }

    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {
      const candidate =
        `VPM-${dateCode}-${String(next + attempt).padStart(4, "0")}`;

      const exists =
        await logisticsVendorPaymentRepository
          .codeExists({
            companyId,
            paymentCode:
              candidate,
          });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate Vendor Payment code"
    );
  }

  assertCompanyId(companyId) {
    if (
      !companyId ||
      !mongoose.isValidObjectId(
        companyId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid company ID"
      );
    }
  }

  assertObjectId(
    value,
    message
  ) {
    if (
      !mongoose.isValidObjectId(
        value
      )
    ) {
      throw new ApiError(
        400,
        message
      );
    }
  }
}

function calculateAmounts({
  totalAmount,
  previousAdvance,
  paidAmount,
  deduction,
}) {
  const total =
    Number(totalAmount || 0);

  const advance =
    Number(previousAdvance || 0);

  const paid =
    Number(paidAmount || 0);

  const deduct =
    Number(deduction || 0);

  if (
    advance +
      paid +
      deduct >
    total
  ) {
    throw new ApiError(
      400,
      "Previous Advance + Paid Amount + Deduction cannot exceed Total Amount"
    );
  }

  const balance =
    Math.max(
      0,
      total -
      advance -
      paid -
      deduct
    );

  return {
    totalAmount:
      total,

    previousAdvance:
      advance,

    paidAmount:
      paid,

    deduction:
      deduct,

    pendingAmount:
      balance,

    supplierBalance:
      balance,
  };
}

function deriveStatus({
  requestedStatus,
  totalAmount,
  previousAdvance,
  paidAmount,
  deduction,
  supplierBalance,
}) {
  if (
    [
      "hold",
      "cancelled",
      "other",
    ].includes(
      requestedStatus
    )
  ) {
    return requestedStatus;
  }

  if (
    Number(totalAmount || 0) >
      0 &&
    Number(supplierBalance || 0) <=
      0
  ) {
    return "paid";
  }

  if (
    Number(previousAdvance || 0) >
      0 ||
    Number(paidAmount || 0) >
      0 ||
    Number(deduction || 0) >
      0
  ) {
    return "partial";
  }

  return "pending";
}

function normalizePaymentMode(
  value
) {
  return value ===
    "bank-transfer"
    ? "bank_transfer"
    : value;
}

export const
  logisticsVendorPaymentService =
    new LogisticsVendorPaymentService();

export default
  logisticsVendorPaymentService;
