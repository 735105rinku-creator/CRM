import * as XLSX from "xlsx";

import LogisticsShipment
  from "../models/LogisticsShipment.js";

import LogisticsCustomer
  from "../models/LogisticsCustomer.js";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import LogisticsProductService
  from "../models/LogisticsProductService.js";

import LogisticsVendorPayment
  from "../models/LogisticsVendorPayment.js";

import logisticsShipmentService
  from "./logisticsShipment.service.js";

import logisticsCustomerService
  from "./logisticsCustomer.service.js";

import logisticsVendorService
  from "./logisticsVendor.service.js";

import logisticsProductServiceService
  from "./logisticsProductService.service.js";

import logisticsVendorPaymentService
  from "./logisticsVendorPayment.service.js";

import { ApiError }
  from "../utils/apiError.js";

const SUPPORTED_MODULES = new Set([
  "shipments",
  "customers",
  "vendors",
  "products-services",
  "vendor-payments",
]);

const MODULE_CONFIG = {
  shipments: {
    sheetName: "Shipments",
    headers: [
      "Shipment Number",
      "Shipment Mode",
      "Customer Name",
      "Contact Person",
      "Mobile",
      "Email",
      "Origin",
      "Destination",
      "Commodity",
      "Gross Weight",
      "Weight Unit",
      "Freight Amount",
      "Currency",
      "Status",
      "Remarks",
    ],
    sample: {
      "Shipment Number": "",
      "Shipment Mode": "air_cargo",
      "Customer Name": "Global Traders",
      "Contact Person": "Amit Verma",
      "Mobile": "9876543210",
      "Email": "amit@example.com",
      "Origin": "Delhi",
      "Destination": "Dubai",
      "Commodity": "Rice",
      "Gross Weight": 1000,
      "Weight Unit": "kg",
      "Freight Amount": 85000,
      "Currency": "INR",
      "Status": "draft",
      "Remarks": "Imported shipment",
    },
  },

  customers: {
    sheetName: "Customers",
    headers: [
      "Customer Type",
      "Customer Name",
      "Company Name",
      "Contact Person",
      "Mobile",
      "Alternate Mobile",
      "Email",
      "GST Type",
      "GST Number",
      "PAN Number",
      "IEC Number",
      "Address Line 1",
      "Address Line 2",
      "City",
      "State",
      "Country",
      "Pincode",
      "Payment Terms",
      "Credit Limit",
      "Opening Balance",
      "Currency",
      "Preferred Mode",
      "Status",
      "Remarks",
    ],
    sample: {
      "Customer Type": "company",
      "Customer Name": "Global Traders",
      "Company Name": "Global Traders Pvt Ltd",
      "Contact Person": "Amit Verma",
      "Mobile": "9876543210",
      "Alternate Mobile": "",
      "Email": "amit@example.com",
      "GST Type": "registered",
      "GST Number": "",
      "PAN Number": "",
      "IEC Number": "",
      "Address Line 1": "Sector 63",
      "Address Line 2": "",
      "City": "Noida",
      "State": "Uttar Pradesh",
      "Country": "India",
      "Pincode": "201301",
      "Payment Terms": "30 Days",
      "Credit Limit": 100000,
      "Opening Balance": 0,
      "Currency": "INR",
      "Preferred Mode": "multi_mode",
      "Status": "active",
      "Remarks": "Imported customer",
    },
  },

  vendors: {
    sheetName: "Vendors",
    headers: [
      "Vendor Type",
      "Vendor Name",
      "Company Name",
      "Contact Person",
      "Mobile",
      "Alternate Mobile",
      "Email",
      "GST Type",
      "GST Number",
      "PAN Number",
      "IEC Number",
      "Address Line 1",
      "Address Line 2",
      "City",
      "State",
      "Country",
      "Pincode",
      "Service Category",
      "Products Services",
      "Payment Terms",
      "Credit Days",
      "Opening Payable",
      "Currency",
      "Preferred Payment Mode",
      "Bank Name",
      "Account Holder Name",
      "Account Number",
      "IFSC Code",
      "Branch Name",
      "Status",
      "Remarks",
    ],
    sample: {
      "Vendor Type": "supplier",
      "Vendor Name": "ABC Logistics",
      "Company Name": "ABC Logistics Pvt Ltd",
      "Contact Person": "Raj Kumar",
      "Mobile": "9876543211",
      "Alternate Mobile": "",
      "Email": "raj@example.com",
      "GST Type": "registered",
      "GST Number": "",
      "PAN Number": "",
      "IEC Number": "",
      "Address Line 1": "Transport Nagar",
      "Address Line 2": "",
      "City": "Delhi",
      "State": "Delhi",
      "Country": "India",
      "Pincode": "110001",
      "Service Category": "road_transport",
      "Products Services": "Road Transport|Handling",
      "Payment Terms": "30 Days",
      "Credit Days": 30,
      "Opening Payable": 0,
      "Currency": "INR",
      "Preferred Payment Mode": "bank_transfer",
      "Bank Name": "HDFC Bank",
      "Account Holder Name": "ABC Logistics Pvt Ltd",
      "Account Number": "1234567890",
      "IFSC Code": "HDFC0000001",
      "Branch Name": "Delhi",
      "Status": "active",
      "Remarks": "Imported vendor",
    },
  },

  "products-services": {
    sheetName: "Products Services",
    headers: [
      "Item Type",
      "Name",
      "Category",
      "Description",
      "SKU",
      "HSN SAC Code",
      "Unit",
      "Cost Price",
      "Sale Price",
      "Tax Percent",
      "Currency",
      "Vendor Code",
      "Service Mode",
      "Status",
      "Remarks",
    ],
    sample: {
      "Item Type": "service",
      "Name": "Air Freight",
      "Category": "Freight",
      "Description": "Air cargo freight service",
      "SKU": "AIR-FRT",
      "HSN SAC Code": "9965",
      "Unit": "shipment",
      "Cost Price": 50000,
      "Sale Price": 65000,
      "Tax Percent": 18,
      "Currency": "INR",
      "Vendor Code": "",
      "Service Mode": "air_cargo",
      "Status": "active",
      "Remarks": "Imported service",
    },
  },

  "vendor-payments": {
    sheetName: "Vendor Payments",
    headers: [
      "Vendor Code",
      "Export Invoice No",
      "Invoice Date",
      "From",
      "Vendor Invoice No",
      "Vendor Invoice Date",
      "Weight",
      "Weight Unit",
      "Total Amount",
      "Previous Advance",
      "Paid Amount",
      "Deduction",
      "Shipment Number",
      "Currency",
      "Status",
      "Remarks",
    ],
    sample: {
      "Vendor Code": "VEN-260810-0001",
      "Export Invoice No": "EXP-001",
      "Invoice Date": "2026-08-10",
      "From": "Delhi",
      "Vendor Invoice No": "VIN-001",
      "Vendor Invoice Date": "2026-08-10",
      "Weight": 25,
      "Weight Unit": "mt",
      "Total Amount": 100000,
      "Previous Advance": 10000,
      "Paid Amount": 20000,
      "Deduction": 0,
      "Shipment Number": "",
      "Currency": "INR",
      "Status": "partial",
      "Remarks": "Imported supplier payment",
    },
  },
};

class LogisticsImportExportService {
  assertModule(moduleName) {
    if (!SUPPORTED_MODULES.has(moduleName)) {
      throw new ApiError(
        400,
        `Unsupported module. Allowed: ${Array.from(
          SUPPORTED_MODULES
        ).join(", ")}`
      );
    }
  }

  readRows(buffer) {
    if (!buffer?.length) {
      throw new ApiError(
        400,
        "Import file is empty"
      );
    }

    const workbook =
      XLSX.read(buffer, {
        type: "buffer",
        cellDates: true,
      });

    const firstSheet =
      workbook.SheetNames[0];

    if (!firstSheet) {
      throw new ApiError(
        400,
        "Workbook has no worksheet"
      );
    }

    return XLSX.utils.sheet_to_json(
      workbook.Sheets[firstSheet],
      {
        defval: "",
        raw: false,
      }
    );
  }

  template(moduleName, format = "xlsx") {
    this.assertModule(moduleName);

    const config =
      MODULE_CONFIG[moduleName];

    return this.buildWorkbookFile({
      rows: [
        config.sample,
      ],
      sheetName:
        config.sheetName,
      format,
    });
  }

  async exportModule({
    companyId,
    moduleName,
    format = "xlsx",
  }) {
    this.assertModule(moduleName);

    let rows = [];

    switch (moduleName) {
      case "shipments":
        rows =
          await this.exportShipments(
            companyId
          );
        break;

      case "customers":
        rows =
          await this.exportCustomers(
            companyId
          );
        break;

      case "vendors":
        rows =
          await this.exportVendors(
            companyId
          );
        break;

      case "products-services":
        rows =
          await this.exportProducts(
            companyId
          );
        break;

      case "vendor-payments":
        rows =
          await this.exportVendorPayments(
            companyId
          );
        break;
    }

    return this.buildWorkbookFile({
      rows,
      sheetName:
        MODULE_CONFIG[moduleName]
          .sheetName,
      format,
    });
  }

  async importModule({
    companyId,
    userId = null,
    employeeId = null,
    moduleName,
    buffer,
  }) {
    this.assertModule(moduleName);

    const rows =
      this.readRows(buffer);

    if (!rows.length) {
      throw new ApiError(
        400,
        "No data rows found in import file"
      );
    }

    const result = {
      module:
        moduleName,

      totalRows:
        rows.length,

      imported:
        0,

      skipped:
        0,

      failed:
        0,

      errors:
        [],
    };

    for (
      let index = 0;
      index < rows.length;
      index += 1
    ) {
      const row =
        rows[index];

      try {
        const outcome =
          await this.importRow({
            companyId,
            userId,
            employeeId,
            moduleName,
            row,
          });

        if (
          outcome ===
          "skipped"
        ) {
          result.skipped +=
            1;
        } else {
          result.imported +=
            1;
        }
      } catch (error) {
        result.failed +=
          1;

        result.errors.push({
          row:
            index + 2,

          message:
            error?.message ||
            "Import failed",
        });
      }
    }

    return result;
  }

  async importRow({
    companyId,
    userId,
    employeeId,
    moduleName,
    row,
  }) {
    switch (moduleName) {
      case "shipments":
        return this.importShipment({
          companyId,
          userId,
          employeeId,
          row,
        });

      case "customers":
        return this.importCustomer({
          companyId,
          userId,
          employeeId,
          row,
        });

      case "vendors":
        return this.importVendor({
          companyId,
          userId,
          employeeId,
          row,
        });

      case "products-services":
        return this.importProduct({
          companyId,
          userId,
          employeeId,
          row,
        });

      case "vendor-payments":
        return this.importVendorPayment({
          companyId,
          userId,
          employeeId,
          row,
        });

      default:
        return "skipped";
    }
  }

  async importShipment({
    companyId,
    userId,
    employeeId,
    row,
  }) {
    const shipmentNumber =
      text(row["Shipment Number"])
        .toUpperCase();

    if (shipmentNumber) {
      const exists =
        await LogisticsShipment.exists({
          companyId,
          shipmentNumber,
          isActive: true,
        });

      if (exists) {
        return "skipped";
      }
    }

    const shipmentMode =
      normalizeShipmentMode(
        row["Shipment Mode"]
      );

    const customerName =
      requiredText(
        row["Customer Name"],
        "Customer Name"
      );

    const remarks =
      requiredText(
        row["Remarks"],
        "Remarks"
      );

    const origin =
      text(row["Origin"]);

    const destination =
      text(row["Destination"]);

    const payload = {
      shipmentNumber:
        shipmentNumber ||
        undefined,

      shipmentMode,

      customerName,

      contactPerson:
        text(
          row["Contact Person"]
        ),

      mobile:
        text(row["Mobile"]),

      email:
        text(row["Email"]),

      currentLocation:
        origin,

      cargo: {
        commodity:
          text(
            row["Commodity"]
          ),

        grossWeight:
          number(
            row[
              "Gross Weight"
            ]
          ),

        weightUnit:
          normalizeWeightUnit(
            row["Weight Unit"]
          ),
      },

      route: {
        origin,
        destination,
      },

      charges: {
        freightAmount:
          number(
            row[
              "Freight Amount"
            ]
          ),

        currency:
          text(
            row["Currency"]
          )
            .toUpperCase() ||
          "INR",
      },

      status:
        normalizeStatus(
          row["Status"] ||
          "draft"
        ),

      remarks,
    };

    if (
      shipmentMode ===
      "air_cargo"
    ) {
      payload.airFreight = {
        departureAirport:
          origin,

        arrivalAirport:
          destination,
      };
    }

    if (
      shipmentMode ===
      "sea_freight"
    ) {
      payload.seaFreight = {
        originPort:
          origin,

        destinationPort:
          destination,
      };
    }

    await logisticsShipmentService
      .createShipment({
        companyId,
        userId,
        employeeId,
        payload,
      });

    return "imported";
  }

  async importCustomer({
    companyId,
    userId,
    employeeId,
    row,
  }) {
    const customerName =
      requiredText(
        row["Customer Name"],
        "Customer Name"
      );

    const mobile =
      requiredText(
        row["Mobile"],
        "Mobile"
      );

    const duplicate =
      await LogisticsCustomer.exists({
        companyId,
        customerName:
          new RegExp(
            `^${escapeRegex(
              customerName
            )}$`,
            "i"
          ),
        mobile,
        isActive: true,
      });

    if (duplicate) {
      return "skipped";
    }

    await logisticsCustomerService
      .createCustomer({
        companyId,
        userId,
        employeeId,

        payload: {
          customerType:
            text(
              row[
                "Customer Type"
              ]
            ) ||
            "company",

          customerName,

          companyName:
            text(
              row[
                "Company Name"
              ]
            ),

          contactPerson:
            requiredText(
              row[
                "Contact Person"
              ],
              "Contact Person"
            ),

          mobile,

          alternateMobile:
            text(
              row[
                "Alternate Mobile"
              ]
            ),

          email:
            text(row["Email"]),

          gstType:
            text(
              row["GST Type"]
            ) ||
            "registered",

          gstNumber:
            text(
              row[
                "GST Number"
              ]
            ),

          panNumber:
            text(
              row[
                "PAN Number"
              ]
            ),

          iecNumber:
            text(
              row[
                "IEC Number"
              ]
            ),

          billingAddress: {
            addressLine1:
              text(
                row[
                  "Address Line 1"
                ]
              ),

            addressLine2:
              text(
                row[
                  "Address Line 2"
                ]
              ),

            city:
              text(row["City"]),

            state:
              text(row["State"]),

            country:
              text(
                row["Country"]
              ) ||
              "India",

            pincode:
              text(
                row["Pincode"]
              ),
          },

          shippingAddress: {
            addressLine1:
              text(
                row[
                  "Address Line 1"
                ]
              ),

            addressLine2:
              text(
                row[
                  "Address Line 2"
                ]
              ),

            city:
              text(row["City"]),

            state:
              text(row["State"]),

            country:
              text(
                row["Country"]
              ) ||
              "India",

            pincode:
              text(
                row["Pincode"]
              ),
          },

          sameAsBilling:
            true,

          paymentTerms:
            text(
              row[
                "Payment Terms"
              ]
            ) ||
            "30 Days",

          creditLimit:
            number(
              row[
                "Credit Limit"
              ]
            ),

          openingBalance:
            number(
              row[
                "Opening Balance"
              ]
            ),

          currency:
            text(
              row["Currency"]
            )
              .toUpperCase() ||
            "INR",

          preferredMode:
            normalizePreferredMode(
              row[
                "Preferred Mode"
              ]
            ),

          status:
            text(row["Status"]) ||
            "active",

          remarks:
            requiredText(
              row["Remarks"],
              "Remarks"
            ),
        },
      });

    return "imported";
  }

  async importVendor({
    companyId,
    userId,
    employeeId,
    row,
  }) {
    const vendorName =
      requiredText(
        row["Vendor Name"],
        "Vendor Name"
      );

    const mobile =
      requiredText(
        row["Mobile"],
        "Mobile"
      );

    const duplicate =
      await LogisticsVendor.exists({
        companyId,
        vendorName:
          new RegExp(
            `^${escapeRegex(
              vendorName
            )}$`,
            "i"
          ),
        mobile,
        isActive: true,
      });

    if (duplicate) {
      return "skipped";
    }

    await logisticsVendorService
      .createVendor({
        companyId,
        userId,
        employeeId,

        payload: {
          vendorType:
            text(
              row["Vendor Type"]
            ) ||
            "supplier",

          vendorName,

          companyName:
            text(
              row[
                "Company Name"
              ]
            ),

          contactPerson:
            requiredText(
              row[
                "Contact Person"
              ],
              "Contact Person"
            ),

          mobile,

          alternateMobile:
            text(
              row[
                "Alternate Mobile"
              ]
            ),

          email:
            text(row["Email"]),

          gstType:
            text(
              row["GST Type"]
            ) ||
            "registered",

          gstNumber:
            text(
              row[
                "GST Number"
              ]
            ),

          panNumber:
            text(
              row[
                "PAN Number"
              ]
            ),

          iecNumber:
            text(
              row[
                "IEC Number"
              ]
            ),

          address: {
            addressLine1:
              text(
                row[
                  "Address Line 1"
                ]
              ),

            addressLine2:
              text(
                row[
                  "Address Line 2"
                ]
              ),

            city:
              text(row["City"]),

            state:
              text(row["State"]),

            country:
              text(
                row["Country"]
              ) ||
              "India",

            pincode:
              text(
                row["Pincode"]
              ),
          },

          serviceCategory:
            normalizeServiceCategory(
              row[
                "Service Category"
              ]
            ),

          productsServices:
            text(
              row[
                "Products Services"
              ]
            )
              .split("|")
              .map(
                item =>
                  item.trim()
              )
              .filter(Boolean),

          paymentTerms:
            requiredText(
              row[
                "Payment Terms"
              ],
              "Payment Terms"
            ),

          creditDays:
            number(
              row[
                "Credit Days"
              ]
            ),

          openingPayable:
            number(
              row[
                "Opening Payable"
              ]
            ),

          currency:
            text(
              row["Currency"]
            )
              .toUpperCase() ||
            "INR",

          preferredPaymentMode:
            normalizePaymentMode(
              row[
                "Preferred Payment Mode"
              ]
            ),

          bankDetails: {
            bankName:
              text(
                row[
                  "Bank Name"
                ]
              ),

            accountHolderName:
              text(
                row[
                  "Account Holder Name"
                ]
              ),

            accountNumber:
              text(
                row[
                  "Account Number"
                ]
              ),

            ifscCode:
              text(
                row[
                  "IFSC Code"
                ]
              ),

            branchName:
              text(
                row[
                  "Branch Name"
                ]
              ),
          },

          status:
            text(row["Status"]) ||
            "active",

          remarks:
            requiredText(
              row["Remarks"],
              "Remarks"
            ),
        },
      });

    return "imported";
  }

  async importProduct({
    companyId,
    userId,
    employeeId,
    row,
  }) {
    const name =
      requiredText(
        row["Name"],
        "Name"
      );

    const itemType =
      requiredText(
        row["Item Type"],
        "Item Type"
      );

    const duplicate =
      await LogisticsProductService
        .exists({
          companyId,
          name:
            new RegExp(
              `^${escapeRegex(
                name
              )}$`,
              "i"
            ),
          itemType,
          isActive: true,
        });

    if (duplicate) {
      return "skipped";
    }

    let vendorId = null;

    const vendorCode =
      text(
        row["Vendor Code"]
      )
        .toUpperCase();

    if (vendorCode) {
      const vendor =
        await LogisticsVendor
          .findOne({
            companyId,
            vendorCode,
            isActive: true,
          })
          .select("_id")
          .lean();

      if (!vendor) {
        throw new ApiError(
          404,
          `Vendor Code ${vendorCode} not found`
        );
      }

      vendorId =
        vendor._id;
    }

    await logisticsProductServiceService
      .createItem({
        companyId,
        userId,
        employeeId,

        payload: {
          itemType,

          name,

          category:
            requiredText(
              row["Category"],
              "Category"
            ),

          description:
            text(
              row[
                "Description"
              ]
            ),

          sku:
            text(row["SKU"]),

          hsnSacCode:
            text(
              row[
                "HSN SAC Code"
              ]
            ),

          unit:
            requiredText(
              row["Unit"],
              "Unit"
            ),

          costPrice:
            number(
              row[
                "Cost Price"
              ]
            ),

          salePrice:
            number(
              row[
                "Sale Price"
              ]
            ),

          taxPercent:
            number(
              row[
                "Tax Percent"
              ]
            ),

          currency:
            text(
              row["Currency"]
            )
              .toUpperCase() ||
            "INR",

          vendorId,

          serviceMode:
            normalizeServiceMode(
              row[
                "Service Mode"
              ]
            ),

          status:
            text(row["Status"]) ||
            "active",

          remarks:
            requiredText(
              row["Remarks"],
              "Remarks"
            ),
        },
      });

    return "imported";
  }

  async importVendorPayment({
    companyId,
    userId,
    employeeId,
    row,
  }) {
    const vendorCode =
      requiredText(
        row["Vendor Code"],
        "Vendor Code"
      )
        .toUpperCase();

    const vendor =
      await LogisticsVendor
        .findOne({
          companyId,
          vendorCode,
          isActive: true,
        })
        .select(
          "_id vendorName"
        )
        .lean();

    if (!vendor) {
      throw new ApiError(
        404,
        `Vendor Code ${vendorCode} not found`
      );
    }

    const vendorInvoiceNo =
      requiredText(
        row[
          "Vendor Invoice No"
        ],
        "Vendor Invoice No"
      )
        .toUpperCase();

    const duplicate =
      await LogisticsVendorPayment
        .exists({
          companyId,
          vendorId:
            vendor._id,
          vendorInvoiceNo,
          isActive: true,
        });

    if (duplicate) {
      return "skipped";
    }

    await logisticsVendorPaymentService
      .createPaymentRecord({
        companyId,
        userId,
        employeeId,

        payload: {
          vendorId:
            String(vendor._id),

          exportInvoiceNo:
            requiredText(
              row[
                "Export Invoice No"
              ],
              "Export Invoice No"
            ),

          invoiceDate:
            requiredDate(
              row[
                "Invoice Date"
              ],
              "Invoice Date"
            ),

          from:
            requiredText(
              row["From"],
              "From"
            ),

          vendorInvoiceNo,

          vendorInvoiceDate:
            requiredDate(
              row[
                "Vendor Invoice Date"
              ],
              "Vendor Invoice Date"
            ),

          weight:
            number(
              row["Weight"]
            ),

          weightUnit:
            normalizeWeightUnit(
              row[
                "Weight Unit"
              ]
            ),

          totalAmount:
            number(
              row[
                "Total Amount"
              ]
            ),

          previousAdvance:
            number(
              row[
                "Previous Advance"
              ]
            ),

          paidAmount:
            number(
              row[
                "Paid Amount"
              ]
            ),

          deduction:
            number(
              row[
                "Deduction"
              ]
            ),

          shipmentNumber:
            text(
              row[
                "Shipment Number"
              ]
            ),

          currency:
            text(
              row["Currency"]
            )
              .toUpperCase() ||
            "INR",

          status:
            text(row["Status"]) ||
            "pending",

          remarks:
            requiredText(
              row["Remarks"],
              "Remarks"
            ),
        },
      });

    return "imported";
  }

  async exportShipments(companyId) {
    const records =
      await LogisticsShipment
        .find({
          companyId,
          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return records.map(
      item => ({
        "Shipment Number":
          item.shipmentNumber ||
          "",

        "Shipment Mode":
          item.shipmentMode ||
          "",

        "Customer Name":
          item.customerName ||
          "",

        "Contact Person":
          item.contactPerson ||
          "",

        "Mobile":
          item.mobile || "",

        "Email":
          item.email || "",

        "Origin":
          item.route?.origin ||
          item.airFreight
            ?.departureAirport ||
          item.seaFreight
            ?.originPort ||
          "",

        "Destination":
          item.route
            ?.destination ||
          item.airFreight
            ?.arrivalAirport ||
          item.seaFreight
            ?.destinationPort ||
          "",

        "Commodity":
          item.cargo
            ?.commodity ||
          "",

        "Gross Weight":
          item.cargo
            ?.grossWeight ||
          0,

        "Weight Unit":
          item.cargo
            ?.weightUnit ||
          "kg",

        "Freight Amount":
          item.charges
            ?.freightAmount ||
          0,

        "Currency":
          item.charges
            ?.currency ||
          "INR",

        "Status":
          item.status || "",

        "Remarks":
          item.remarks ||
          "",
      })
    );
  }

  async exportCustomers(companyId) {
    const records =
      await LogisticsCustomer
        .find({
          companyId,
          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return records.map(
      item => ({
        "Customer Code":
          item.customerCode ||
          "",

        "Customer Type":
          item.customerType ||
          "",

        "Customer Name":
          item.customerName ||
          "",

        "Company Name":
          item.companyName ||
          "",

        "Contact Person":
          item.contactPerson ||
          "",

        "Mobile":
          item.mobile || "",

        "Email":
          item.email || "",

        "GST Number":
          item.gstNumber ||
          "",

        "PAN Number":
          item.panNumber ||
          "",

        "IEC Number":
          item.iecNumber ||
          "",

        "City":
          item.billingAddress
            ?.city ||
          "",

        "State":
          item.billingAddress
            ?.state ||
          "",

        "Country":
          item.billingAddress
            ?.country ||
          "",

        "Credit Limit":
          item.creditLimit ||
          0,

        "Opening Balance":
          item.openingBalance ||
          0,

        "Currency":
          item.currency ||
          "INR",

        "Status":
          item.status ||
          "",

        "Remarks":
          item.remarks ||
          "",
      })
    );
  }

  async exportVendors(companyId) {
    const records =
      await LogisticsVendor
        .find({
          companyId,
          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return records.map(
      item => ({
        "Vendor Code":
          item.vendorCode ||
          "",

        "Vendor Type":
          item.vendorType ||
          "",

        "Vendor Name":
          item.vendorName ||
          "",

        "Company Name":
          item.companyName ||
          "",

        "Contact Person":
          item.contactPerson ||
          "",

        "Mobile":
          item.mobile || "",

        "Email":
          item.email || "",

        "GST Number":
          item.gstNumber ||
          "",

        "Service Category":
          item.serviceCategory ||
          "",

        "Payment Terms":
          item.paymentTerms ||
          "",

        "Credit Days":
          item.creditDays ||
          0,

        "Opening Payable":
          item.openingPayable ||
          0,

        "Currency":
          item.currency ||
          "INR",

        "Status":
          item.status ||
          "",

        "Remarks":
          item.remarks ||
          "",
      })
    );
  }

  async exportProducts(companyId) {
    const records =
      await LogisticsProductService
        .find({
          companyId,
          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .populate(
          "vendorId",
          "vendorCode vendorName"
        )
        .lean();

    return records.map(
      item => ({
        "Item Code":
          item.itemCode ||
          "",

        "Item Type":
          item.itemType ||
          "",

        "Name":
          item.name || "",

        "Category":
          item.category ||
          "",

        "SKU":
          item.sku || "",

        "HSN SAC Code":
          item.hsnSacCode ||
          "",

        "Unit":
          item.unit || "",

        "Cost Price":
          item.costPrice ||
          0,

        "Sale Price":
          item.salePrice ||
          0,

        "Tax Percent":
          item.taxPercent ||
          0,

        "Currency":
          item.currency ||
          "INR",

        "Vendor Code":
          item.vendorId
            ?.vendorCode ||
          "",

        "Vendor Name":
          item.vendorName ||
          item.vendorId
            ?.vendorName ||
          "",

        "Service Mode":
          item.serviceMode ||
          "",

        "Status":
          item.status ||
          "",

        "Remarks":
          item.remarks ||
          "",
      })
    );
  }

  async exportVendorPayments(companyId) {
    const records =
      await LogisticsVendorPayment
        .find({
          companyId,
          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .populate(
          "vendorId",
          "vendorCode vendorName"
        )
        .lean();

    return records.map(
      item => ({
        "S.No.":
          item.serialNumber ||
          "",

        "Payment Code":
          item.paymentCode ||
          "",

        "Vendor Code":
          item.vendorId
            ?.vendorCode ||
          "",

        "Vendor":
          item.vendor ||
          "",

        "Export Invoice No":
          item.exportInvoiceNo ||
          "",

        "Invoice Date":
          dateText(
            item.invoiceDate
          ),

        "From":
          item.from || "",

        "Vendor Invoice No":
          item.vendorInvoiceNo ||
          "",

        "Vendor Invoice Date":
          dateText(
            item.vendorInvoiceDate
          ),

        "Weight":
          item.weight || 0,

        "Weight Unit":
          item.weightUnit ||
          "",

        "Total Amount":
          item.totalAmount ||
          0,

        "Previous Advance":
          item.previousAdvance ||
          0,

        "Pending Amount":
          item.pendingAmount ||
          0,

        "Paid Amount":
          item.paidAmount ||
          0,

        "Deduction":
          item.deduction ||
          0,

        "Supplier Balance":
          item.supplierBalance ||
          0,

        "Status":
          item.status ||
          "",

        "Remarks":
          item.remarks ||
          "",
      })
    );
  }

  buildWorkbookFile({
    rows,
    sheetName,
    format,
  }) {
    const workbook =
      XLSX.utils.book_new();

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows || []
      );

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheetName
    );

    const normalizedFormat =
      String(format || "xlsx")
        .toLowerCase();

    if (
      normalizedFormat ===
      "csv"
    ) {
      return {
        buffer:
          Buffer.from(
            "\uFEFF" +
            XLSX.utils
              .sheet_to_csv(
                worksheet
              ),
            "utf8"
          ),

        contentType:
          "text/csv; charset=utf-8",

        extension:
          "csv",
      };
    }

    return {
      buffer:
        XLSX.write(
          workbook,
          {
            type: "buffer",
            bookType: "xlsx",
          }
        ),

      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      extension:
        "xlsx",
    };
  }
}

function requiredText(
  value,
  label
) {
  const result =
    text(value);

  if (!result) {
    throw new ApiError(
      400,
      `${label} is required`
    );
  }

  return result;
}

function text(value) {
  return String(
    value ??
    ""
  ).trim();
}

function number(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const parsed =
    Number(
      String(value)
        .replaceAll(",", "")
  );

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    throw new ApiError(
      400,
      `Invalid number: ${value}`
    );
  }

  return parsed;
}

function requiredDate(
  value,
  label
) {
  if (!value) {
    throw new ApiError(
      400,
      `${label} is required`
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new ApiError(
      400,
      `${label} is invalid`
    );
  }

  return date;
}

function dateText(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? ""
    : date
        .toISOString()
        .slice(
          0,
          10
        );
}

function normalizeShipmentMode(value) {
  const result =
    text(value)
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("-", "_");

  const aliases = {
    air:
      "air_cargo",

    aircargo:
      "air_cargo",

    air_cargo:
      "air_cargo",

    sea:
      "sea_freight",

    seafreight:
      "sea_freight",

    sea_freight:
      "sea_freight",

    road_transport:
      "road",

    road:
      "road",
  };

  const mode =
    aliases[result] ||
    result;

  if (
    ![
      "air_cargo",
      "sea_freight",
      "road",
      "other",
    ].includes(mode)
  ) {
    throw new ApiError(
      400,
      `Invalid Shipment Mode: ${value}`
    );
  }

  return mode;
}

function normalizeWeightUnit(value) {
  const unit =
    text(value)
      .toLowerCase() ||
    "kg";

  if (
    [
      "kg",
      "mt",
      "ton",
      "lb",
      "other",
    ].includes(unit)
  ) {
    return unit;
  }

  return "other";
}

function normalizeStatus(value) {
  return text(value)
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_") ||
    "draft";
}

function normalizePreferredMode(value) {
  const v =
    text(value)
      .toLowerCase()
      .replaceAll("-", "_")
      .replaceAll(" ", "_");

  return (
    v ||
    "multi_mode"
  );
}

function normalizeServiceCategory(value) {
  return text(value)
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_") ||
    "goods";
}

function normalizeServiceMode(value) {
  return text(value)
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_") ||
    "not_applicable";
}

function normalizePaymentMode(value) {
  return text(value)
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_") ||
    "bank_transfer";
}

function escapeRegex(value) {
  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}

export const logisticsImportExportService =
  new LogisticsImportExportService();

export default logisticsImportExportService;
