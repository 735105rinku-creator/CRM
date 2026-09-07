import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";


test(
  "accounting router mounts Trial Balance",
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
      /trialBalance/i,
      "accounting.routes.js must import the Trial Balance router."
    );


    assert.match(
      source,
      /["']\/trial-balance["']/,
      "accounting.routes.js must mount /trial-balance."
    );

  }
);
