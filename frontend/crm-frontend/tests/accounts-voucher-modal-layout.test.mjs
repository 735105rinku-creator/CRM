import assert from "node:assert/strict";
import {
  readFileSync
} from "node:fs";
import { test } from "node:test";

const scss =
  readFileSync(
    "./src/app/features/accounts/pages/voucher-entry/voucher-entry.component.scss",
    "utf8"
  );


test(
  "voucher modal overlay stays above the fixed Accounts sidebar",
  () => {

    const match =
      scss.match(
        /\.form-overlay\s*\{([\s\S]*?)\}/
      );

    assert.ok(
      match,
      "form-overlay styles are missing"
    );

    const block =
      match[1];

    assert.match(
      block,
      /z-index:\s*(?:12\d\d|1[3-9]\d\d|[2-9]\d{3,})\s*;/
    );
  }
);


test(
  "voucher modal uses one internal scroll container",
  () => {

    const overlay =
      scss.match(
        /\.form-overlay\s*\{([\s\S]*?)\}/
      );

    const card =
      scss.match(
        /\.voucher-form-card\s*\{([\s\S]*?)\}/
      );

    assert.ok(
      overlay,
      "form-overlay styles are missing"
    );

    assert.ok(
      card,
      "voucher-form-card styles are missing"
    );

    assert.match(
      overlay[1],
      /overflow:\s*hidden\s*;/
    );

    assert.match(
      card[1],
      /overflow-y:\s*auto\s*;/
    );
  }
);


test(
  "voucher modal remains inside the viewport",
  () => {

    const card =
      scss.match(
        /\.voucher-form-card\s*\{([\s\S]*?)\}/
      );

    assert.ok(
      card,
      "voucher-form-card styles are missing"
    );

    assert.match(
      card[1],
      /width:\s*min\(1180px,\s*calc\(100vw\s*-\s*48px\)\)\s*;/
    );

    assert.match(
      card[1],
      /box-sizing:\s*border-box\s*;/
    );
  }
);
