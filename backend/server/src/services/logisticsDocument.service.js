import mongoose from "mongoose";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import logisticsDocumentRepository
  from "../repositories/logisticsDocument.repository.js";

import { ApiError }
  from "../utils/apiError.js";


class LogisticsDocumentService {

  /* ==========================================================
     CREATE
  ========================================================== */

  async createDocument({
    companyId,

    userId = null,

    employeeId = null,

    payload,

    file,
  }) {

    this.assertCompanyId(
      companyId
    );


    if (
      !file
    ) {

      throw new ApiError(
        400,
        "Document file is required"
      );
    }


    const shipmentNumber =
      String(
        payload.shipmentNo ||
        ""
      )
        .trim()
        .toUpperCase();


    const shipment = await LogisticsShipment.findOne({companyId,shipmentNumber,isActive:true,}).select("_id shipmentNumber customerName status currentLocation trackingReference")
        .lean();


    if(!shipment) {
      throw new ApiError(
        404,
        "Logistics shipment not found"
      );
    }


    const documentNumber =
      await this.generateDocumentNumber({
        companyId,
      });


    const document = await logisticsDocumentRepository
        .create({ companyId, shipmentId: shipment._id, shipmentNumber: shipment.shipmentNumber,customerName:payload.customer ||shipment.customerName,
          documentNumber,
          documentType:
          payload.documentType,
          documentTypeOther:
          payload.documentTypeOther ||
            "",

          documentTitle:
            payload.documentTitle ||
            "",


          issueDate:
            this.dateOrNull(
              payload.issueDate
            ),

          expiryDate:
            this.dateOrNull(
              payload.expiryDate
            ),


          issuingAuthority:
            payload.issuingAuthority ||
            "",

          referenceNumber:
            payload.referenceNumber ||
            "",


          fileName:
            file.filename,

          originalFileName:
            file.originalname,

          filePath:
            file.path,

          fileUrl:
            this.buildFileUrl(
              file.filename
            ),

          mimeType:
            file.mimetype,

          fileSize:
            file.size,


          status:
            payload.status ||
            "pending",

          statusOther:
            payload.statusOther ||
            "",


          remarks:
            payload.remarks,


          uploadedBy:
            userId,

          uploadedByEmployeeId:
            employeeId,

          updatedBy:
            userId,
        });


    await LogisticsShipment.updateOne(
      { _id: shipment._id, companyId, isActive: true },
      {
        $set: { updatedBy: userId },
        $push: {
          statusHistory: {
            status: shipment.status || "documents_pending",
            location: shipment.currentLocation || "",
            remarks: `Document ${document.documentNumber} uploaded for shipment ${shipment.shipmentNumber}.`,
            changedBy: userId,
            changedAt: new Date(),
          },
        },
      }
    );

    return document;
  }


  /* ==========================================================
     GET ONE
  ========================================================== */

  async getDocument({
    companyId,
    documentId,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      documentId,
      "Invalid document ID"
    );


    const document =
      await logisticsDocumentRepository
        .findById({
          companyId,
          documentId,
        });


    if (
      !document
    ) {

      throw new ApiError(
        404,
        "Logistics document not found"
      );
    }


    return document;
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async listDocuments({
    companyId,
    query = {},
  }) {

    this.assertCompanyId(
      companyId
    );


    /*
     * Keep expired status correct before showing list.
     */
    await logisticsDocumentRepository
      .markExpired({
        companyId,
      });


    return logisticsDocumentRepository
      .paginate({
        companyId,

        page:
          query.page,

        limit:
          query.limit,

        search:
          query.search,

        shipmentId:
          query.shipmentId,

        shipmentNo:
          query.shipmentNo,

        documentType:
          query.documentType,

        status:
          query.status,

        fromDate:
          query.fromDate,

        toDate:
          query.toDate,

        sortBy:
          query.sortBy,

        sortOrder:
          query.sortOrder,
      });
  }


  /* ==========================================================
     UPDATE
  ========================================================== */

  async updateDocument({
    companyId,
    documentId,
    userId = null,
    payload,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      documentId,
      "Invalid document ID"
    );


    const current =
      await logisticsDocumentRepository
        .findById({
          companyId,
          documentId,
        });


    if (
      !current
    ) {

      throw new ApiError(
        404,
        "Logistics document not found"
      );
    }


    const normalized = {
      ...payload,

      updatedBy:
        userId,
    };


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          normalized,
          "issueDate"
        )
    ) {

      normalized.issueDate =
        this.dateOrNull(
          normalized.issueDate
        );
    }


    if (
      Object.prototype
        .hasOwnProperty
        .call(
          normalized,
          "expiryDate"
        )
    ) {

      normalized.expiryDate =
        this.dateOrNull(
          normalized.expiryDate
        );
    }


    const updated =
      await logisticsDocumentRepository
        .updateById({
          companyId,

          documentId,

          payload:
            normalized,
        });


    if (
      !updated
    ) {

      throw new ApiError(
        404,
        "Logistics document not found"
      );
    }


    return updated;
  }


  /* ==========================================================
     DELETE
  ========================================================== */

  async deleteDocument({
    companyId,
    documentId,
    userId = null,
  }) {

    this.assertCompanyId(
      companyId
    );


    this.assertObjectId(
      documentId,
      "Invalid document ID"
    );


    const current =
      await logisticsDocumentRepository
        .findById({
          companyId,
          documentId,
        });


    if (
      !current
    ) {

      throw new ApiError(
        404,
        "Logistics document not found"
      );
    }


    const deleted =
      await logisticsDocumentRepository
        .softDelete({
          companyId,

          documentId,

          updatedBy:
            userId,
        });


    if (
      !deleted
    ) {

      throw new ApiError(
        404,
        "Logistics document not found"
      );
    }


    return {
      documentId:
        deleted._id,

      documentNumber:
        deleted.documentNumber,

      deleted:
        true,
    };
  }


  /* ==========================================================
     SUMMARY
  ========================================================== */

  async getSummary({
    companyId,
  }) {

    this.assertCompanyId(
      companyId
    );


    await logisticsDocumentRepository
      .markExpired({
        companyId,
      });


    const rows =
      await logisticsDocumentRepository
        .summary(
          companyId
        );


    const summary = {
      total:
        0,

      valid:
        0,

      pending:
        0,

      expired:
        0,

      rejected:
        0,

      other:
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


      if (
        row._id &&
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


  /* ==========================================================
     GENERATE DOCUMENT NUMBER
  ========================================================== */

  async generateDocumentNumber({
    companyId,
  }) {

    const now =
      new Date();


    const year =
      String(
        now.getFullYear()
      )
        .slice(
          -2
        );


    const month =
      String(
        now.getMonth() +
        1
      )
        .padStart(
          2,
          "0"
        );


    const day =
      String(
        now.getDate()
      )
        .padStart(
          2,
          "0"
        );


    const dateCode =
      `${year}${month}${day}`;


    const latest =
      await logisticsDocumentRepository
        .findLatestDocumentNumber({
          companyId,

          dateCode,
        });


    let next =
      1;


    if (
      latest
        ?.documentNumber
    ) {

      const parts =
        latest
          .documentNumber
          .split(
            "-"
          );


      const last =
        Number(
          parts[
            parts.length -
            1
          ]
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

      const sequence =
        String(
          next +
          attempt
        )
          .padStart(
            4,
            "0"
          );


      const candidate =
        `DOC-${dateCode}-${sequence}`;


      const exists =
        await logisticsDocumentRepository
          .documentNumberExists({
            companyId,

            documentNumber:
              candidate,
          });


      if (
        !exists
      ) {

        return candidate;
      }
    }


    throw new ApiError(
      500,
      "Unable to generate document number"
    );
  }


  /* ==========================================================
     FILE URL
  ========================================================== */

  buildFileUrl(
    fileName
  ) {

    return `/uploads/logistics-documents/${fileName}`;
  }


  /* ==========================================================
     HELPERS
  ========================================================== */

  assertCompanyId(
    companyId
  ) {

    if (
      !companyId
    ) {

      throw new ApiError(
        400,
        "Company ID is required"
      );
    }


    if (
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


  dateOrNull(
    value
  ) {

    if (
      !value
    ) {

      return null;
    }


    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return null;
    }


    return date;
  }
}


export const
  logisticsDocumentService =
    new LogisticsDocumentService();


export default
  logisticsDocumentService;


