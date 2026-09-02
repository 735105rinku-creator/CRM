import mongoose from "mongoose";

import logisticsCustomerRepository
  from "../repositories/logisticsCustomer.repository.js";

import { ApiError }
  from "../utils/apiError.js";

class LogisticsCustomerService {
  async createCustomer({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(
      companyId
    );

    const customerCode =
      await this.generateCustomerCode({
        companyId,
      });

    const customer =
      await logisticsCustomerRepository
        .create({
          companyId,

          customerCode,

          customerType:
            payload.customerType ||
            "company",

          customerTypeOther:
            payload.customerType ===
              "other"
              ? payload.customerTypeOther ||
                ""
              : "",

          customerName:
            payload.customerName,

          companyName:
            payload.companyName ||
            payload.customerName,

          contactPerson:
            payload.contactPerson,

          mobile:
            payload.mobile,

          alternateMobile:
            payload.alternateMobile ||
            "",

          email:
            payload.email ||
            "",

          gstType:
            payload.gstType ||
            "registered",

          gstTypeOther:
            payload.gstType ===
              "other"
              ? payload.gstTypeOther ||
                ""
              : "",

          gstNumber:
            payload.gstNumber ||
            "",

          panNumber:
            payload.panNumber ||
            "",

          iecNumber:
            payload.iecNumber ||
            "",

          billingAddress:
            normalizeAddress(
              payload.billingAddress
            ),

          shippingAddress:
            payload.sameAsBilling
              ? normalizeAddress(
                  payload.billingAddress
                )
              : normalizeAddress(
                  payload.shippingAddress
                ),

          pickupAddress:
            normalizeAddress(
              payload.pickupAddress
            ),

          sameAsBilling:
            Boolean(
              payload.sameAsBilling
            ),

          paymentTerms:
            payload.paymentTerms ||
            "30 Days",

          paymentTermsOther:
            payload.paymentTerms ===
              "other"
              ? payload.paymentTermsOther ||
                ""
              : "",

          creditLimit:
            Number(
              payload.creditLimit ||
              0
            ),

          openingBalance:
            Number(
              payload.openingBalance ||
              0
            ),

          balanceType:
            payload.balanceType ||
            "receivable",

          balanceTypeOther:
            payload.balanceType ===
              "other"
              ? payload.balanceTypeOther ||
                ""
              : "",

          currency:
            String(
              payload.currency ||
              "INR"
            )
              .trim()
              .toUpperCase(),

          salesPerson:
            payload.salesPerson ||
            "",

          preferredMode:
            normalizeMode(
              payload.preferredMode ||
              "multi_mode"
            ),

          preferredModeOther:
            payload.preferredMode ===
              "other"
              ? payload.preferredModeOther ||
                ""
              : "",

          status:
            payload.status ||
            "active",

          statusOther:
            payload.status ===
              "other"
              ? payload.statusOther ||
                ""
              : "",

          remarks:
            payload.remarks,

          createdBy:
            userId,

          createdByEmployeeId:
            employeeId,

          updatedBy:
            userId,
        });

    return customer;
  }

  async listCustomers({
    companyId,
    query,
  }) {
    this.assertCompanyId(
      companyId
    );

    return logisticsCustomerRepository
      .paginate({
        companyId,
        ...query,
      });
  }

  async getCustomer({
    companyId,
    customerId,
  }) {
    this.assertCompanyId(
      companyId
    );

    this.assertObjectId(
      customerId,
      "Invalid customer ID"
    );

    const customer =
      await logisticsCustomerRepository
        .findById({
          companyId,
          customerId,
        });

    if (!customer) {
      throw new ApiError(
        404,
        "Logistics customer not found"
      );
    }

    return customer;
  }

  async updateCustomer({
    companyId,
    customerId,
    userId = null,
    payload,
  }) {
    const current =
      await this.getCustomer({
        companyId,
        customerId,
      });

    const update = {
      ...payload,

      updatedBy:
        userId,
    };

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "preferredMode"
        )
    ) {
      update.preferredMode =
        normalizeMode(
          update.preferredMode
        );

      if (
        update.preferredMode !==
        "other"
      ) {
        update.preferredModeOther =
          "";
      }
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "customerType"
        ) &&
      update.customerType !==
        "other"
    ) {
      update.customerTypeOther =
        "";
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "gstType"
        ) &&
      update.gstType !==
        "other"
    ) {
      update.gstTypeOther =
        "";
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "balanceType"
        ) &&
      update.balanceType !==
        "other"
    ) {
      update.balanceTypeOther =
        "";
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "status"
        ) &&
      update.status !==
        "other"
    ) {
      update.statusOther =
        "";
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "billingAddress"
        )
    ) {
      update.billingAddress =
        normalizeAddress(
          update.billingAddress
        );
    }

    if (
      update.sameAsBilling ===
        true
    ) {
      update.shippingAddress =
        normalizeAddress(
          update.billingAddress ||
          current.billingAddress
        );
    } else if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "shippingAddress"
        )
    ) {
      update.shippingAddress =
        normalizeAddress(
          update.shippingAddress
        );
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          update,
          "pickupAddress"
        )
    ) {
      update.pickupAddress =
        normalizeAddress(
          update.pickupAddress
        );
    }

    const customer =
      await logisticsCustomerRepository
        .updateById({
          companyId,
          customerId,
          payload:
            update,
        });

    if (!customer) {
      throw new ApiError(
        404,
        "Logistics customer not found"
      );
    }

    return customer;
  }

  async deleteCustomer({
    companyId,
    customerId,
    userId = null,
  }) {
    const current =
      await this.getCustomer({
        companyId,
        customerId,
      });

    await logisticsCustomerRepository
      .softDelete({
        companyId,
        customerId,
        userId,
      });

    return {
      customerId:
        current._id,

      customerCode:
        current.customerCode,

      deleted:
        true,
    };
  }

  async getSummary({
    companyId,
  }) {
    this.assertCompanyId(
      companyId
    );

    const rows =
      await logisticsCustomerRepository
        .summary(
          new mongoose.Types.ObjectId(
            String(companyId)
          )
        );

    const summary = {
      total:
        0,

      active:
        0,

      inactive:
        0,

      blocked:
        0,

      other:
        0,

      totalCreditLimit:
        0,

      openingBalance:
        0,
    };

    for (
      const row of rows
    ) {
      const count =
        Number(
          row.count ||
          0
        );

      summary.total +=
        count;

      summary.totalCreditLimit +=
        Number(
          row.creditLimit ||
          0
        );

      summary.openingBalance +=
        Number(
          row.openingBalance ||
          0
        );

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
    }

    return summary;
  }

  async generateCustomerCode({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await logisticsCustomerRepository
        .latestCode({
          companyId,
          dateCode,
        });

    let next =
      1;

    if (
      latest?.customerCode
    ) {
      const last =
        Number(
          latest.customerCode
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
      let attempt =
        0;

      attempt <
        100;

      attempt +=
        1
    ) {
      const candidate =
        `CUS-${dateCode}-${String(next + attempt).padStart(4, "0")}`;

      const exists =
        await logisticsCustomerRepository
          .codeExists({
            companyId,

            customerCode:
              candidate,
          });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate customer code"
    );
  }

  assertCompanyId(
    companyId
  ) {
    if (
      !companyId ||
      !mongoose
        .isValidObjectId(
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
      !mongoose
        .isValidObjectId(
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

function normalizeAddress(
  value
) {
  const source =
    value ||
    {};

  return {
    addressLine1:
      source.addressLine1 ||
      "",

    addressLine2:
      source.addressLine2 ||
      "",

    city:
      source.city ||
      "",

    state:
      source.state ||
      "",

    country:
      source.country ||
      "India",

    pincode:
      source.pincode ||
      "",
  };
}

function normalizeMode(
  value
) {
  switch (value) {
    case "air-cargo":
      return "air_cargo";

    case "sea-freight":
      return "sea_freight";

    case "multi-mode":
      return "multi_mode";

    default:
      return value;
  }
}

export const
  logisticsCustomerService =
    new LogisticsCustomerService();

export default
  logisticsCustomerService;