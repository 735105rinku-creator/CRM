import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";


test(
  "accounting router mounts Balance Sheet",
  async () => {

    const source =
      await fs.readFile(
        new URL(
          "../routes/accounting.routes.js",
          import.meta.url
        ),
        "utf8"
      );


    assert.match(
      source,
      /balanceSheetRoutes/
    );


    assert.match(
      source,
      /["']\/balance-sheet["']/
    );

  }
);
