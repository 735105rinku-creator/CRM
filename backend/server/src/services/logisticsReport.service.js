import mongoose from "mongoose";
import LogisticsShipment from "../models/LogisticsShipment.js";
import LogisticsInvoice from "../models/LogisticsInvoice.js";
import LogisticsVendorPayment from "../models/LogisticsVendorPayment.js";

class LogisticsReportService {
  normalizeMode(value) {
    return ({ air_cargo: "air-cargo", sea_freight: "sea-freight", road_transport: "road" })[value] || value || "other";
  }

  normalizeStatus(value) {
    return String(value || "").replaceAll("_", "-");
  }

  async generate({ companyId, query = {} }) {
    const from = query.fromDate ? new Date(query.fromDate) : null;
    const to = query.toDate ? new Date(query.toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const shipmentFilter = { companyId, isActive: true };
    if (from || to) {
      shipmentFilter.createdAt = {};
      if (from) shipmentFilter.createdAt.$gte = from;
      if (to) shipmentFilter.createdAt.$lte = to;
    }
    if (query.mode && query.mode !== "all") {
      shipmentFilter.shipmentMode = ({ "air-cargo": "air_cargo", "sea-freight": "sea_freight", road: "road" })[query.mode] || query.mode;
    }
    if (query.status && query.status !== "all") {
      shipmentFilter.status = String(query.status).replaceAll("-", "_");
    }

    const shipments = await LogisticsShipment.find(shipmentFilter)
      .sort({ createdAt: -1 })
      .lean();

    const shipmentNumbers = shipments.map(x => x.shipmentNumber).filter(Boolean);

    const [invoices, vendorPayments] = await Promise.all([
      LogisticsInvoice.find({
        companyId,
        isActive: true,
        ...(shipmentNumbers.length ? { shipmentNumber: { $in: shipmentNumbers } } : {}),
      }).lean(),
      LogisticsVendorPayment.find({
        companyId,
        isActive: true,
        ...(shipmentNumbers.length ? { shipmentNumber: { $in: shipmentNumbers } } : {}),
      }).lean(),
    ]);

    const invoiceMap = new Map();
    for (const invoice of invoices) {
      const key = invoice.shipmentNumber || "";
      const value = invoiceMap.get(key) || { invoiceAmount: 0, receivedAmount: 0, outstandingAmount: 0, gstAmount: 0 };
      value.invoiceAmount += Number(invoice.invoiceTotal || 0);
      value.receivedAmount += Number(invoice.amountReceived || 0);
      value.outstandingAmount += Number(invoice.balanceDue || 0);
      value.gstAmount += Number(invoice.taxTotal || 0);
      invoiceMap.set(key, value);
    }

    const vendorMap = new Map();
    for (const payment of vendorPayments) {
      const key = payment.shipmentNumber || "";
      const value = vendorMap.get(key) || { vendor: "", vendorAmount: 0, vendorPaid: 0, vendorBalance: 0 };
      if (!value.vendor) value.vendor = payment.vendor || "";
      value.vendorAmount += Number(payment.totalAmount || 0);
      value.vendorPaid += Number(payment.paidAmount || 0) + Number(payment.previousAdvance || 0);
      value.vendorBalance += Number(payment.supplierBalance || payment.pendingAmount || 0);
      vendorMap.set(key, value);
    }

    const search = String(query.search || "").trim().toLowerCase();

    const rows = shipments.map((shipment, index) => {
      const invoice = invoiceMap.get(shipment.shipmentNumber) || {};
      const vendor = vendorMap.get(shipment.shipmentNumber) || {};
      return {
        id: String(shipment._id || index + 1),
        shipmentNo: shipment.shipmentNumber || "",
        date: shipment.createdAt ? new Date(shipment.createdAt).toISOString().slice(0, 10) : "",
        customer: shipment.customerName || "",
        vendor: vendor.vendor || "",
        mode: this.normalizeMode(shipment.shipmentMode),
        origin: shipment.origin || shipment.route?.origin || shipment.airFreight?.departureAirport || shipment.seaFreight?.originPort || "",
        destination: shipment.destination || shipment.route?.destination || shipment.airFreight?.arrivalAirport || shipment.seaFreight?.destinationPort || "",
        invoiceAmount: Number(invoice.invoiceAmount || 0),
        receivedAmount: Number(invoice.receivedAmount || 0),
        outstandingAmount: Number(invoice.outstandingAmount || 0),
        vendorAmount: Number(vendor.vendorAmount || 0),
        vendorPaid: Number(vendor.vendorPaid || 0),
        vendorBalance: Number(vendor.vendorBalance || 0),
        gstAmount: Number(invoice.gstAmount || 0),
        status: this.normalizeStatus(shipment.status),
      };
    }).filter(row => !search || [row.shipmentNo,row.customer,row.vendor,row.origin,row.destination].some(v => String(v||"").toLowerCase().includes(search)));

    const summary = rows.reduce((a, row) => {
      a.shipments += 1;
      a.sales += row.invoiceAmount;
      a.received += row.receivedAmount;
      a.outstanding += row.outstandingAmount;
      a.vendorPayable += row.vendorBalance;
      a.gst += row.gstAmount;
      return a;
    }, { shipments: 0, sales: 0, received: 0, outstanding: 0, vendorPayable: 0, gst: 0 });

    const modeSummary = {
      air: rows.filter(x => x.mode === "air-cargo").length,
      sea: rows.filter(x => x.mode === "sea-freight").length,
      road: rows.filter(x => x.mode === "road").length,
    };

    const deliverySummary = {
      delivered: rows.filter(x => x.status === "delivered").length,
      transit: rows.filter(x => x.status === "in-transit").length,
      customs: rows.filter(x => x.status === "customs").length,
      cancelled: rows.filter(x => x.status === "cancelled").length,
    };

    return { reportType: query.reportType || "shipment-performance", rows, summary, modeSummary, deliverySummary };
  }

  toCsv(result) {
    const headers = ["Shipment","Date","Customer","Vendor","Mode","Origin","Destination","Invoice Amount","Received Amount","Outstanding Amount","Vendor Amount","Vendor Paid","Vendor Balance","GST Amount","Status"];
    const escape = value => `"${String(value ?? "").replaceAll('"','""')}"`;
    const lines = result.rows.map(r => [r.shipmentNo,r.date,r.customer,r.vendor,r.mode,r.origin,r.destination,r.invoiceAmount,r.receivedAmount,r.outstandingAmount,r.vendorAmount,r.vendorPaid,r.vendorBalance,r.gstAmount,r.status].map(escape).join(","));
    return [headers.map(escape).join(","), ...lines].join("\n");
  }
}

export default new LogisticsReportService();
