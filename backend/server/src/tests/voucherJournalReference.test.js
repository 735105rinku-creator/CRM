import assert from "node:assert/strict";
import { test } from "node:test";

import {
  JOURNAL_REFERENCE_TYPES,
} from "../constants/accounting.js";

test(
  "Journal Entry supports Voucher as an accounting source",
  () => {
    assert.equal(
      JOURNAL_REFERENCE_TYPES.includes(
        "voucher"
      ),
      true
    );
  }
);
