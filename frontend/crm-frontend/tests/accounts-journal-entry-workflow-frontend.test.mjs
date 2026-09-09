import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const component = read(
  "src/app/features/accounts/pages/journal-entries/journal-entries.component.ts"
);

const template = read(
  "src/app/features/accounts/pages/journal-entries/journal-entries.component.html"
);

const service = read(
  "src/app/features/accounts/services/journal-entry.service.ts"
);

test(
  "journal entries page exposes a New Journal Entry action",
  () => {
    assert.match(
      template,
      /New Journal Entry/
    );

    assert.match(
      template,
      /\(click\)=["']openCreateForm\(\)["']/
    );

    assert.match(
      component,
      /openCreateForm\s*\(/
    );
  }
);

test(
  "journal entry form captures date narration reference and balanced lines",
  () => {
    assert.match(
      template,
      /Journal Date/
    );

    assert.match(
      template,
      /Narration/
    );

    assert.match(
      template,
      /Reference No\./
    );

    assert.match(
      template,
      /Account/
    );

    assert.match(
      template,
      /Debit/
    );

    assert.match(
      template,
      /Credit/
    );

    assert.match(
      template,
      /Add Line/
    );

    assert.match(
      template,
      /Total Debit/
    );

    assert.match(
      template,
      /Total Credit/
    );

    assert.match(
      template,
      /Difference/
    );
  }
);

test(
  "journal entries component creates a draft through JournalEntryService",
  () => {
    assert.match(
      component,
      /saveDraft\s*\(/
    );

    assert.match(
      component,
      /journalEntryService[\s\S]*?\.create\s*\(/
    );

    assert.match(
      component,
      /CreateJournalEntryPayload/
    );
  }
);

test(
  "journal entry service already exposes draft create endpoint",
  () => {
    assert.match(
      service,
      /create\s*\(/
    );

    assert.match(
      service,
      /CreateJournalEntryPayload/
    );

    assert.match(
      service,
      /this\.api\.post<JournalEntry>/
    );
  }
);
