import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const MONTHS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const safeText = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const sanitizeFileName = (value) => {
  return String(value || "payslip")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toUpperCase();
};

const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value || ""));

const companyThemeColor = (company) => {
  const primary = company?.settings?.theme?.primaryColor;
  return isHexColor(primary) ? primary : "#1a3c5e";
};

const companyAccentColor = (company) => {
  const accent = company?.settings?.theme?.accentColor;
  return isHexColor(accent) ? accent : "#0d9488";
};

const companyAddressLine = (company) => {
  const address = company?.address || {};
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const resolveLogoPath = (logo) => {
  if (!logo || /^https?:\/\//i.test(logo)) return null;
  const normalized = String(logo).replace(/\\/g, "/");
  const extension = path.extname(normalized).toLowerCase();

  if (![".png", ".jpg", ".jpeg"].includes(extension)) {
    return null;
  }

  const candidates = [];

  if (path.isAbsolute(normalized)) {
    candidates.push(normalized);
  } else {
    const withoutLeadingSlash = normalized.replace(/^\/+/, "");
    candidates.push(path.join(process.cwd(), withoutLeadingSlash));

    if (withoutLeadingSlash.startsWith("uploads/")) {
      candidates.push(path.join(process.cwd(), "public", withoutLeadingSlash));
    }
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const drawLogo = (doc, logoPath, x, y, options) => {
  if (!logoPath) return false;

  try {
    doc.image(logoPath, x, y, options);
    return true;
  } catch {
    return false;
  }
};

const drawLine = (doc, y) => {
  doc
    .strokeColor("#e5e7eb")
    .lineWidth(1)
    .moveTo(40, y)
    .lineTo(555, y)
    .stroke();
};

const drawKeyValue = (doc, label, value, x, y, width = 230) => {
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text(label, x, y);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#111827")
    .text(safeText(value), x + 92, y, { width: width - 92 });
};

const drawComponentTable = (doc, title, rows, x, y, width, color = "#111827") => {
  doc
    .roundedRect(x, y, width, 24, 4)
    .fillAndStroke(color, color);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(title, x + 8, y + 7);

  y += 24;

  doc
    .rect(x, y, width, 22)
    .fillAndStroke("#f3f4f6", "#e5e7eb");

  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Component", x + 8, y + 6, { width: width - 105 });

  doc.text("Amount", x + width - 95, y + 6, {
    width: 85,
    align: "right",
  });

  y += 22;

  if (!rows?.length) {
    doc
      .rect(x, y, width, 24)
      .strokeColor("#e5e7eb")
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text("No records", x + 8, y + 7);

    return y + 24;
  }

  rows.forEach((item) => {
    doc
      .rect(x, y, width, 24)
      .strokeColor("#e5e7eb")
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111827")
      .text(safeText(item.name || item.code), x + 8, y + 7, {
        width: width - 105,
      });

    doc.text(formatMoney(item.amount), x + width - 95, y + 7, {
      width: 85,
      align: "right",
    });

    y += 24;
  });

  return y;
};

export const generatePayslipPdfFile = async ({ company, payslip }) => {
  const slip =
    typeof payslip.toObject === "function" ? payslip.toObject() : payslip;

  const employee = slip.employeeId || {};
  const payrollRun = slip.payrollRunId || {};
  const primaryColor = companyThemeColor(company);
  const accentColor = companyAccentColor(company);
  const logoPath = resolveLogoPath(company?.logo);
  const addressLine = companyAddressLine(company);

  const yearMonth = `${slip.year}-${String(slip.month).padStart(2, "0")}`;
  const fileName = `${sanitizeFileName(slip.payslipNumber)}.pdf`;

  const dir = path.join(process.cwd(), "uploads", "payslips", yearMonth);
  const filePath = path.join(dir, fileName);

  await fsp.mkdir(dir, { recursive: true });

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: `Payslip ${slip.payslipNumber}`,
      Author: company?.companyName || "OPAS BIZZ CRM",
      Subject: "Employee Payslip",
    },
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  if (logoPath) {
    doc.save();
    doc.opacity(0.06);
    drawLogo(doc, logoPath, 178, 236, { width: 240 });
    doc.restore();
  }

  doc.rect(0, 0, 595.28, 13).fill(primaryColor);

  const logoRendered = drawLogo(doc, logoPath, 40, 34, {
    fit: [68, 54],
    align: "left",
    valign: "center",
  });

  if (!logoRendered) {
    doc
      .roundedRect(40, 34, 54, 54, 8)
      .fillAndStroke("#f8fafc", "#e5e7eb")
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(primaryColor)
      .text(safeText(company?.companyCode || company?.companyName || "CO", "CO").slice(0, 2).toUpperCase(), 40, 52, {
        width: 54,
        align: "center",
      });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(primaryColor)
    .text(company?.companyName || "Company", 118, 36, { width: 265 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#374151")
    .text(company?.email || "", 118, 60)
    .text(company?.phone || "", 118, 74);

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(primaryColor)
    .text("PAYSLIP", 390, 36, { width: 165, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text(`# ${slip.payslipNumber}`, 390, 61, {
      width: 165,
      align: "right",
    })
    .text(`${MONTHS[slip.month]} ${slip.year}`, 390, 77, {
      width: 165,
      align: "right",
    });

  doc
    .moveTo(40, 108)
    .lineTo(555, 108)
    .lineWidth(2)
    .strokeColor(accentColor)
    .stroke();

  drawKeyValue(doc, "Payslip No.", slip.payslipNumber, 40, 128);
  drawKeyValue(
    doc,
    "Payroll Code",
    payrollRun.payrollCode || "-",
    310,
    128
  );

  drawKeyValue(
    doc,
    "Employee",
    employee.displayName || "-",
    40,
    151
  );
  drawKeyValue(
    doc,
    "Employee Code",
    employee.employeeCode || "-",
    310,
    151
  );

  drawKeyValue(
    doc,
    "Email",
    employee.officialEmail || "-",
    40,
    174
  );
  drawKeyValue(
    doc,
    "Mobile",
    employee.mobile || "-",
    310,
    174
  );

  drawKeyValue(
    doc,
    "Bank",
    slip.bankName || "-",
    40,
    197
  );
  drawKeyValue(
    doc,
    "Account No.",
    slip.accountNumber || "-",
    310,
    197
  );

  drawKeyValue(
    doc,
    "IFSC",
    slip.ifscCode || "-",
    40,
    220
  );
  drawKeyValue(
    doc,
    "Status",
    slip.status || "-",
    310,
    220
  );

  drawLine(doc, 253);

  const earningsEndY = drawComponentTable(
    doc,
    "Earnings",
    slip.earnings || [],
    40,
    275,
    245,
    primaryColor
  );

  const deductionsEndY = drawComponentTable(
    doc,
    "Deductions",
    slip.deductions || [],
    310,
    275,
    245,
    primaryColor
  );

  let y = Math.max(earningsEndY, deductionsEndY) + 25;

  if (y > 620) {
    doc.addPage();
    y = 50;
  }

  doc
    .roundedRect(40, y, 515, 84, 6)
    .fillAndStroke("#f9fafb", "#e5e7eb");

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111827")
    .text("Salary Summary", 55, y + 14);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#374151")
    .text("Gross Salary", 55, y + 38)
    .text(formatMoney(slip.grossSalary), 190, y + 38, {
      width: 100,
      align: "right",
    })
    .text("Total Deductions", 315, y + 38)
    .text(formatMoney(slip.totalDeductions), 445, y + 38, {
      width: 90,
      align: "right",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111827")
    .text("Net Salary", 55, y + 62)
    .text(formatMoney(slip.netSalary), 415, y + 62, {
      width: 120,
      align: "right",
    });

  drawLine(doc, 724);

  const footerLines = [
    company?.website,
    company?.email,
    company?.phone,
    addressLine,
  ].filter(Boolean);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6b7280")
    .text(footerLines.join(" | "), 40, 740, {
      width: 515,
      align: "center",
    })
    .text(
      "This is a system generated payslip and does not require a signature.",
      40,
      766,
      { width: 515, align: "center" }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    filePath,
    fileName,
    pdfUrl: `/hr/payroll/payslips/${slip._id}/pdf`,
  };
};
