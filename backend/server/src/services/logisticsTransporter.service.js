import mongoose from "mongoose";

import logisticsTransporterRepository
  from "../repositories/logisticsTransporter.repository.js";

import { ApiError } from "../utils/apiError.js";

class LogisticsTransporterService {
  async createTransporter({
    companyId,
    userId = null,
    employeeId = null,
    payload,
  }) {
    this.assertCompanyId(companyId);

    const transporterCode =
      await this.generateTransporterCode({ companyId });

    return logisticsTransporterRepository.create({
      companyId,
      transporterCode,
      transporterName: payload.transporterName,
      contactPerson: payload.contactPerson,
      mobile: payload.mobile,
      alternateMobile: payload.alternateMobile || "",
      email: payload.email || "",
      gstNumber: payload.gstNumber || "",
      panNumber: payload.panNumber || "",
      address: payload.address,
      city: payload.city || "",
      state: payload.state || "",
      country: payload.country || "India",
      pincode: payload.pincode || "",
      serviceType: payload.serviceType || "domestic",
      serviceTypeOther:
        payload.serviceType === "other"
          ? payload.serviceTypeOther || ""
          : "",
      vehicleTypes:
        Array.isArray(payload.vehicleTypes)
          ? payload.vehicleTypes
          : [],
      defaultDriverName: payload.defaultDriverName || "",
      defaultDriverMobile: payload.defaultDriverMobile || "",
      defaultVehicleNumber: payload.defaultVehicleNumber || "",
      paymentTerms: payload.paymentTerms || "",
      creditDays: Number(payload.creditDays || 0),
      bankDetails: payload.bankDetails || {},
      status: payload.status || "active",
      statusOther:
        payload.status === "other"
          ? payload.statusOther || ""
          : "",
      remarks: payload.remarks,
      createdBy: userId,
      createdByEmployeeId: employeeId,
      updatedBy: userId,
    });
  }

  async listTransporters({ companyId, query }) {
    this.assertCompanyId(companyId);
    return logisticsTransporterRepository.paginate({ companyId, ...query });
  }

  async getTransporter({ companyId, transporterId }) {
    this.assertCompanyId(companyId);
    this.assertObjectId(transporterId, "Invalid transporter ID");

    const record = await logisticsTransporterRepository.findById({
      companyId,
      transporterId,
    });

    if (!record) {
      throw new ApiError(404, "Logistics transporter not found");
    }

    return record;
  }

  async updateTransporter({
    companyId,
    transporterId,
    userId = null,
    payload,
  }) {
    await this.getTransporter({ companyId, transporterId });

    const update = { ...payload, updatedBy: userId };

    if (
      Object.prototype.hasOwnProperty.call(update, "serviceType") &&
      update.serviceType !== "other"
    ) {
      update.serviceTypeOther = "";
    }

    if (
      Object.prototype.hasOwnProperty.call(update, "status") &&
      update.status !== "other"
    ) {
      update.statusOther = "";
    }

    const record = await logisticsTransporterRepository.updateById({
      companyId,
      transporterId,
      payload: update,
    });

    if (!record) {
      throw new ApiError(404, "Logistics transporter not found");
    }

    return record;
  }

  async deleteTransporter({ companyId, transporterId, userId = null }) {
    const current = await this.getTransporter({ companyId, transporterId });

    await logisticsTransporterRepository.softDelete({
      companyId,
      transporterId,
      userId,
    });

    return {
      transporterId: current._id,
      transporterCode: current.transporterCode,
      deleted: true,
    };
  }

  async getSummary({ companyId }) {
    this.assertCompanyId(companyId);

    const rows = await logisticsTransporterRepository.summary(
      new mongoose.Types.ObjectId(String(companyId))
    );

    const summary = {
      total: 0,
      active: 0,
      inactive: 0,
      blocked: 0,
      other: 0,
    };

    for (const row of rows) {
      const count = Number(row.count || 0);
      summary.total += count;

      if (Object.prototype.hasOwnProperty.call(summary, row._id)) {
        summary[row._id] = count;
      }
    }

    return summary;
  }

  async generateTransporterCode({ companyId }) {
    const now = new Date();
    const dateCode = `${String(now.getFullYear()).slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const latest = await logisticsTransporterRepository.latestCode({
      companyId,
      dateCode,
    });

    let next = 1;

    if (latest?.transporterCode) {
      const last = Number(latest.transporterCode.split("-").pop());
      if (Number.isFinite(last)) next = last + 1;
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = `TRN-${dateCode}-${String(next + attempt).padStart(
        4,
        "0"
      )}`;

      const exists = await logisticsTransporterRepository.codeExists({
        companyId,
        transporterCode: candidate,
      });

      if (!exists) return candidate;
    }

    throw new ApiError(500, "Unable to generate transporter code");
  }

  assertCompanyId(companyId) {
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      throw new ApiError(400, "Invalid company ID");
    }
  }

  assertObjectId(value, message) {
    if (!mongoose.isValidObjectId(value)) {
      throw new ApiError(400, message);
    }
  }
}

export const logisticsTransporterService =
  new LogisticsTransporterService();

export default logisticsTransporterService;