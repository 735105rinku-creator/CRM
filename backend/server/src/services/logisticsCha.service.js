import mongoose from "mongoose";

import LogisticsShipment from "../models/LogisticsShipment.js";
import LogisticsVendor from "../models/LogisticsVendor.js";
import logisticsChaRepository from "../repositories/logisticsCha.repository.js";
import { ApiError } from "../utils/apiError.js";

class LogisticsChaService {
  async createCase({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const shipmentNumber =
      String(payload.shipmentNo || "")
        .trim()
        .toUpperCase();

    const shipmentFilter = payload.shipmentId && mongoose.isValidObjectId(payload.shipmentId)
      ? { _id: payload.shipmentId, companyId, isActive: true }
      : { companyId, shipmentNumber, isActive: true };

    const shipment =
      await LogisticsShipment.findOne(shipmentFilter)
        .select(
          "_id shipmentNumber shipmentMode shipmentModeOther customerName customs"
        )
        .lean();

    if (!shipment) {
      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }

    const requestedMode =
      normalizeShipmentMode(
        payload.shipmentType
      );

    if (
      requestedMode !== "other" &&
      requestedMode !== shipment.shipmentMode
    ) {
      throw new ApiError(
        400,
        "Selected shipment type does not match the shipment"
      );
    }

    const chaVendor = await this.getChaVendor({
      companyId,
      chaVendorId: payload.chaVendorId,
    });

    const caseNumber =
      await this.generateCaseNumber({
        companyId,
      });

    const status =
      normalizeStatus(
        payload.status ||
        "documents_pending"
      );

    const caseRecord =
      await logisticsChaRepository.create({
        companyId,
        caseNumber,

        shipmentId:
          shipment._id,

        shipmentNumber:
          shipment.shipmentNumber,

        shipmentMode:
          shipment.shipmentMode,

        shipmentModeOther:
          shipment.shipmentMode === "other"
            ? (
                payload.shipmentTypeOther ||
                shipment.shipmentModeOther ||
                ""
              )
            : "",

        customerName:
          shipment.customerName,

        chaVendorId:
          chaVendor?._id || null,

        chaAgent:
          chaVendor?.vendorName || payload.chaAgent,

        chaAgentOther:
          payload.chaAgent === "other"
            ? payload.chaAgentOther || ""
            : "",

        customsLocation:
          payload.customsLocation,

        customsLocationOther:
          payload.customsLocation === "other"
            ? payload.customsLocationOther || ""
            : "",

        assignedDate:
          dateOrNull(
            payload.assignedDate
          ),

        expectedClearanceDate:
          dateOrNull(
            payload.expectedClearanceDate
          ),

        shippingBillNumber:
          payload.shippingBillNo || "",

        shippingBillDate:
          dateOrNull(
            payload.shippingBillDate
          ),

        billOfEntryNumber:
          payload.billOfEntryNo || "",

        billOfEntryDate:
          dateOrNull(
            payload.billOfEntryDate
          ),

        invoiceValue:
          numberValue(
            payload.invoiceValue
          ),

        assessableValue:
          numberValue(
            payload.assessableValue
          ),

        charges:
          buildCharges(
            payload
          ),

        documents:
          buildDocuments(
            payload
          ),

        status,

        statusOther:
          status === "other"
            ? payload.statusOther || ""
            : "",

        remarks:
          payload.remarks,

        statusHistory: [
          {
            status,
            statusOther:
              status === "other"
                ? payload.statusOther || ""
                : "",
            remarks:
              payload.remarks,
            changedBy:
              userId,
            changedAt:
              new Date(),
          },
        ],

        assignedToEmployeeId:
          employeeId,

        createdByEmployeeId:
          employeeId,

        createdBy:
          userId,

        updatedBy:
          userId,
      });

    await this.syncShipmentCustoms({
      shipmentId:
        shipment._id,
      companyId,
      status,
      statusOther:
        payload.statusOther,
      payload: {
        ...payload,
        chaVendorId: chaVendor?._id || null,
      },
      userId,
    });

    return caseRecord;
  }

  async listCases({
    companyId,
    query,
  }) {
    this.assertCompanyId(
      companyId
    );

    return logisticsChaRepository.paginate({
      companyId,
      ...query,
    });
  }

  async getCase({
    companyId,
    chaId,
  }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(
      chaId,
      "Invalid CHA case ID"
    );

    const record =
      await logisticsChaRepository.findById({
        companyId,
        chaId,
      });

    if (!record) {
      throw new ApiError(
        404,
        "CHA case not found"
      );
    }

    return record;
  }

  async updateCase({
    companyId,
    chaId,
    userId = null,
    payload,
  }) {
    const current =
      await this.getCase({
        companyId,
        chaId,
      });

    const update = {};

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "shipmentType"
      )
    ) {
      const requestedMode =
        normalizeShipmentMode(
          payload.shipmentType
        );

      if (
        requestedMode !== current.shipmentMode &&
        requestedMode !== "other"
      ) {
        throw new ApiError(
          400,
          "Changing CHA case to a different shipment mode is not allowed"
        );
      }

      update.shipmentMode =
        current.shipmentMode;

      update.shipmentModeOther =
        current.shipmentMode === "other"
          ? payload.shipmentTypeOther || ""
          : "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "customer"
      )
    ) {
      update.customerName =
        current.customerName;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "chaVendorId")) {
      const chaVendor = await this.getChaVendor({
        companyId,
        chaVendorId: payload.chaVendorId,
      });
      update.chaVendorId = chaVendor?._id || null;
      if (chaVendor?.vendorName) {
        update.chaAgent = chaVendor.vendorName;
      }
    }

    mapIfPresent(
      update,
      payload,
      "chaAgent"
    );

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "chaAgentOther"
      )
    ) {
      update.chaAgentOther =
        payload.chaAgent === "other"
          ? payload.chaAgentOther || ""
          : "";
    }

    mapIfPresent(
      update,
      payload,
      "customsLocation"
    );

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "customsLocationOther"
      )
    ) {
      update.customsLocationOther =
        payload.customsLocation === "other"
          ? payload.customsLocationOther || ""
          : "";
    }

    mapDate(
      update,
      payload,
      "assignedDate"
    );

    mapDate(
      update,
      payload,
      "expectedClearanceDate"
    );

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "shippingBillNo"
      )
    ) {
      update.shippingBillNumber =
        payload.shippingBillNo || "";
    }

    mapDate(
      update,
      payload,
      "shippingBillDate"
    );

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "billOfEntryNo"
      )
    ) {
      update.billOfEntryNumber =
        payload.billOfEntryNo || "";
    }

    mapDate(
      update,
      payload,
      "billOfEntryDate"
    );

    mapNumber(
      update,
      payload,
      "invoiceValue"
    );

    mapNumber(
      update,
      payload,
      "assessableValue"
    );

    if (
      hasChargeField(payload)
    ) {
      update.charges =
        buildCharges(payload);
    }

    if (
      hasDocumentField(payload)
    ) {
      update.documents =
        buildDocuments(payload);
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "status"
      )
    ) {
      update.status =
        normalizeStatus(
          payload.status
        );

      update.statusOther =
        update.status === "other"
          ? payload.statusOther || ""
          : "";
    }

    if (
      Object.prototype.hasOwnProperty.call(
        payload,
        "remarks"
      )
    ) {
      update.remarks =
        payload.remarks;
    }

    update.updatedBy =
      userId;

    const updated =
      await logisticsChaRepository.updateById({
        companyId,
        chaId,
        payload:
          update,
      });

    if (!updated) {
      throw new ApiError(
        404,
        "CHA case not found"
      );
    }

    await this.syncShipmentCustoms({
      shipmentId:
        current.shipmentId,
      companyId,
      status:
        updated.status,
      statusOther:
        updated.statusOther,
      payload: {
        customsLocation:
          updated.customsLocation,
        customsLocationOther:
          updated.customsLocationOther,
        shippingBillNo:
          updated.shippingBillNumber,
        billOfEntryNo:
          updated.billOfEntryNumber,
        chaVendorId:
          updated.chaVendorId || null,
      },
      userId,
    });

    return updated;
  }

  async updateStatus({
    companyId,
    chaId,
    userId = null,
    status,
    statusOther = "",
    remarks,
  }) {
    const current =
      await this.getCase({
        companyId,
        chaId,
      });

    const normalized =
      normalizeStatus(
        status
      );

    const updated =
      await logisticsChaRepository.pushStatus({
        companyId,
        chaId,
        status:
          normalized,
        statusOther,
        remarks,
        userId,
      });

    await this.syncShipmentCustoms({
      shipmentId:
        current.shipmentId,
      companyId,
      status:
        normalized,
      statusOther,
      payload: {
        customsLocation:
          current.customsLocation,
        customsLocationOther:
          current.customsLocationOther,
        shippingBillNo:
          current.shippingBillNumber,
        billOfEntryNo:
          current.billOfEntryNumber,
        chaVendorId:
          current.chaVendorId || null,
      },
      userId,
    });

    return updated;
  }

  async deleteCase({
    companyId,
    chaId,
    userId = null,
  }) {
    await this.getCase({
      companyId,
      chaId,
    });

    const deleted =
      await logisticsChaRepository.softDelete({
        companyId,
        chaId,
        userId,
      });

    return {
      chaId:
        deleted._id,
      caseNumber:
        deleted.caseNumber,
      deleted: true,
    };
  }

  async getSummary({
    companyId,
  }) {
    this.assertCompanyId(
      companyId
    );

    const rows =
      await logisticsChaRepository.summary(
        new mongoose.Types.ObjectId(
          String(companyId)
        )
      );

    const summary = {
      total: 0,
      pending: 0,
      cleared: 0,
      hold: 0,
    };

    for (const row of rows) {
      const count =
        Number(row.count || 0);

      summary.total +=
        count;

      if (row._id === "cleared") {
        summary.cleared +=
          count;
      } else if (row._id === "hold") {
        summary.hold +=
          count;
        summary.pending +=
          count;
      } else {
        summary.pending +=
          count;
      }
    }

    return summary;
  }

  async getChaVendor({
    companyId,
    chaVendorId,
  }) {
    if (!chaVendorId) {
      return null;
    }

    if (!mongoose.isValidObjectId(chaVendorId)) {
      throw new ApiError(400, "Invalid CHA vendor ID");
    }

    const vendor = await LogisticsVendor.findOne({
      _id: chaVendorId,
      companyId,
      vendorType: "cha",
      isActive: true,
    }).select("_id vendorName").lean();

    if (!vendor) {
      throw new ApiError(404, "CHA vendor not found");
    }

    return vendor;
  }


  
  async generateCaseNumber({
    companyId,
  }) {
    const now =
      new Date();

    const dateCode =
      `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest =
      await logisticsChaRepository.latestCaseNumber({
        companyId,
        dateCode,
      });

    let next = 1;

    if (latest?.caseNumber) {
      const last =
        Number(
          latest.caseNumber
            .split("-")
            .pop()
        );

      if (Number.isFinite(last)) {
        next =
          last + 1;
      }
    }

    for (
      let attempt = 0;
      attempt < 100;
      attempt += 1
    ) {
      const candidate =
        `CHA-${dateCode}-${String(next + attempt).padStart(4, "0")}`;

      const exists =
        await logisticsChaRepository.caseNumberExists({
          companyId,
          caseNumber:
            candidate,
        });

      if (!exists) {
        return candidate;
      }
    }

    throw new ApiError(
      500,
      "Unable to generate CHA case number"
    );
  }

  async syncShipmentCustoms({
    shipmentId,
    companyId,
    status,
    statusOther,
    payload,
    userId,
  }) {
    const shipmentCustomsStatus =
      mapChaStatusToShipmentCustoms(
        status
      );

    const setData = {
      "customs.status":
        shipmentCustomsStatus,

      "customs.statusOther":
        status === "other"
          ? statusOther || ""
          : "",

      "customs.customsLocation":
        payload.customsLocation ||
        "",

      "customs.customsLocationOther":
        payload.customsLocation === "other"
          ? payload.customsLocationOther || ""
          : "",

      "customs.shippingBillNumber":
        payload.shippingBillNo ||
        "",

      "customs.billOfEntryNumber":
        payload.billOfEntryNo ||
        "",

      "customs.chaVendorId":
        payload.chaVendorId ||
        null,

      updatedBy:
        userId,
    };

    if (
      status === "cleared"
    ) {
      setData.status =
        "customs";
    }

    if (
      status === "hold" ||
      status === "query_raised" ||
      status === "cancelled"
    ) {
      setData.status =
        "hold";
    }

    await LogisticsShipment.updateOne(
      {
        _id:
          shipmentId,
        companyId,
        isActive: true,
      },
      {
        $set:
          setData,
      }
    );
  }

  assertCompanyId(
    companyId
  ) {
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

function normalizeShipmentMode(value) {
  switch (value) {
    case "air-cargo":
      return "air_cargo";
    case "sea-freight":
      return "sea_freight";
    default:
      return value;
  }
}

function normalizeStatus(value) {
  switch (value) {
    case "documents-pending":
      return "documents_pending";
    case "documents-ready":
      return "documents_ready";
    case "submitted-to-cha":
      return "submitted_to_cha";
    case "duty-pending":
      return "duty_pending";
    case "query-raised":
      return "query_raised";
    default:
      return value;
  }
}

function mapChaStatusToShipmentCustoms(status) {
  switch (status) {
    case "documents_pending":
    case "documents_ready":
    case "submitted_to_cha":
      return "documents_pending";
    case "filed":
      return "filed";
    case "assessment":
      return "assessment";
    case "examination":
      return "examination";
    case "duty_pending":
      return "duty_pending";
    case "cleared":
      return "cleared";
    case "hold":
    case "query_raised":
    case "cancelled":
      return "hold";
    case "other":
      return "other";
    default:
      return "documents_pending";
  }
}

function dateOrNull(value) {
  if (!value) return null;

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function numberValue(value) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function buildCharges(payload) {
  const source =
    payload.charges || {};

  return {
    customsDuty:
      numberValue(
        source.customsDuty ??
        payload.customsDuty
      ),

    igst:
      numberValue(
        source.igst ??
        payload.igst
      ),

    cess:
      numberValue(
        source.cess ??
        payload.cess
      ),

    chaCharge:
      numberValue(
        source.chaCharge ??
        payload.chaCharge
      ),

    examinationCharge:
      numberValue(
        source.examinationCharge ??
        payload.examinationCharge
      ),

    miscellaneousCharge:
      numberValue(
        source.miscellaneousCharge ??
        payload.miscellaneousCharge
      ),
  };
}

function buildDocuments(payload) {
  const source =
    payload.documents || {};

  return {
    invoice:
      Boolean(
        source.invoice ??
        payload.documentInvoice
      ),

    packingList:
      Boolean(
        source.packingList ??
        payload.documentPackingList
      ),

    certificateOfOrigin:
      Boolean(
        source.certificateOfOrigin ??
        payload.documentCertificateOrigin
      ),

    shippingBill:
      Boolean(
        source.shippingBill ??
        payload.documentShippingBill
      ),

    billOfEntry:
      Boolean(
        source.billOfEntry ??
        payload.documentBillOfEntry
      ),

    airwayBill:
      Boolean(
        source.airwayBill ??
        payload.documentAirwayBill
      ),

    billOfLading:
      Boolean(
        source.billOfLading ??
        payload.documentBillOfLading
      ),

    other:
      Boolean(
        source.other ??
        payload.documentOther
      ),
  };
}

function hasChargeField(payload) {
  return [
    "charges",
    "customsDuty",
    "igst",
    "cess",
    "chaCharge",
    "examinationCharge",
    "miscellaneousCharge",
  ].some(
    (key) =>
      Object.prototype.hasOwnProperty.call(
        payload,
        key
      )
  );
}

function hasDocumentField(payload) {
  return [
    "documents",
    "documentInvoice",
    "documentPackingList",
    "documentCertificateOrigin",
    "documentShippingBill",
    "documentBillOfEntry",
    "documentAirwayBill",
    "documentBillOfLading",
    "documentOther",
    "documentOther",
  ].some(
    (key) =>
      Object.prototype.hasOwnProperty.call(
        payload,
        key
      )
  );
}

function mapIfPresent(
  target,
  source,
  key
) {
  if (
    Object.prototype.hasOwnProperty.call(
      source,
      key
    )
  ) {
    target[key] =
      source[key];
  }
}

function mapDate(
  target,
  source,
  key
) {
  if (
    Object.prototype.hasOwnProperty.call(
      source,
      key
    )
  ) {
    target[key] =
      dateOrNull(
        source[key]
      );
  }
}

function mapNumber(
  target,
  source,
  key
) {
  if (
    Object.prototype.hasOwnProperty.call(
      source,
      key
    )
  ) {
    target[key] =
      numberValue(
        source[key]
      );
  }
}

export const logisticsChaService =
  new LogisticsChaService();

export default logisticsChaService;