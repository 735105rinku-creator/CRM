import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";


const read = async (relativePath) =>
  fs.readFile(
    new URL(
      `../${relativePath}`,
      import.meta.url
    ),
    "utf8"
  );


test(
  "GST report models match backend contract",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/models/accounts.models.ts"
      );

    assert.match(
      source,
      /interface\s+GstReportEntry/
    );

    const entryFields = [
      "voucherId",
      "voucherNumber",
      "voucherType",
      "voucherDate",
      "accountId",
      "accountCode",
      "accountName",
      "accountType",
      "accountStatus",
      "debit",
      "credit",
      "taxAmount"
    ];

    for (const field of entryFields) {
      assert.match(
        source,
        new RegExp(
          `${field}:`
        )
      );
    }

    assert.match(
      source,
      /interface\s+GstTaxSection/
    );

    assert.match(
      source,
      /total:\s*number/
    );

    assert.match(
      source,
      /entries:\s*GstReportEntry\[\]/
    );

    assert.match(
      source,
      /interface\s+GstNetResult/
    );

    assert.match(
      source,
      /amount:\s*number/
    );

    assert.match(
      source,
      /['"]payable['"]/
    );

    assert.match(
      source,
      /['"]receivable['"]/
    );

    assert.match(
      source,
      /['"]settled['"]/
    );

    assert.match(
      source,
      /interface\s+GstReport/
    );

    assert.match(
      source,
      /from:\s*string/
    );

    assert.match(
      source,
      /to:\s*string/
    );

    assert.match(
      source,
      /outputTax:\s*GstTaxSection/
    );

    assert.match(
      source,
      /inputTax:\s*GstTaxSection/
    );

    assert.match(
      source,
      /netGst:\s*GstNetResult/
    );

  }
);


test(
  "GST report service uses GET-only endpoint and date filters",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/services/gst-report.service.ts"
      );

    assert.match(
      source,
      /\/accounting\/gst-report/
    );

    assert.match(
      source,
      /getGstReport/
    );

    assert.match(
      source,
      /from/
    );

    assert.match(
      source,
      /to/
    );

    assert.match(
      source,
      /\.get\s*</
    );

    assert.doesNotMatch(
      source,
      /\.(post|put|patch|delete)\s*</i
    );

  }
);


test(
  "accounts route loads real GstReportComponent",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/accounts.routes.ts"
      );

    assert.match(
      source,
      /path:\s*['"]gst-report['"]/
    );

    assert.match(
      source,
      /\.\/pages\/gst-report\/gst-report\.component/
    );

    assert.match(
      source,
      /module\.GstReportComponent/
    );

  }
);


test(
  "accounts sidebar exposes GST Report",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
      );

    assert.match(
      source,
      /label:\s*['"]GST Report['"]/
    );

    assert.match(
      source,
      /route:\s*['"]\/accounts\/gst-report['"]/
    );

  }
);


test(
  "GstReportComponent supports financial period filtering",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/gst-report/gst-report.component.ts"
      );

    assert.match(
      source,
      /class\s+GstReportComponent/
    );

    assert.match(
      source,
      /loadGstReport/
    );

    assert.match(
      source,
      /applyFilters/
    );

    assert.match(
      source,
      /resetFilters/
    );

    assert.match(
      source,
      /from/
    );

    assert.match(
      source,
      /to/
    );

    assert.match(
      source,
      /netGst/
    );

  }
);


test(
  "GST report template renders tax summary and transaction details",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/gst-report/gst-report.component.html"
      );

    const requiredText = [
      "GST Report",
      "From",
      "To",
      "Output GST",
      "Input GST",
      "Net GST",
      "Voucher Date",
      "Voucher Number",
      "Voucher Type",
      "Account Code",
      "Account Name",
      "Debit",
      "Credit",
      "Tax Amount"
    ];

    for (const text of requiredText) {

      assert.match(
        source,
        new RegExp(
          text.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          ),
          "i"
        )
      );

    }

  }
);