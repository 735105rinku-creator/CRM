import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";


test(
  "accounting router mounts Profit & Loss",
  () => {

    const source =
      fs.readFileSync(
        new URL(
          "../routes/accounting.routes.js",
          import.meta.url
        ),
        "utf8"
      );


    assert.match(
      source,
      /profitLossRoutes/
    );


    assert.match(
      source,
      /["']\/profit-and-loss["']/
    );

  }
);
