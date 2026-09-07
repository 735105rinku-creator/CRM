import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const accountingRoutesPath =
  new URL(
    "../routes/accounting.routes.js",
    import.meta.url
  );

test(
  "accounting router mounts GST Report",
  async () => {
    const source =
      await fs.readFile(
        accountingRoutesPath,
        "utf8"
      );

    assert.match(
      source,
      /gstReportRoutes/
    );

    assert.match(
      source,
      /["']\/gst-report["']/
    );
  }
);
