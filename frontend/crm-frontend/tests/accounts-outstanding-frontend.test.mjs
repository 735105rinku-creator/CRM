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
  "outstanding models match backend report contract",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/models/accounts.models.ts"
      );

    assert.match(
      source,
      /interface\s+OutstandingBalance/
    );

    assert.match(
      source,
      /amount:\s*number/
    );

    assert.match(
      source,
      /type:\s*DebitCredit/
    );

    assert.match(
      source,
      /interface\s+OutstandingEntry/
    );

    assert.match(
      source,
      /journalNumber:\s*string/
    );

    assert.match(
      source,
      /journalDate:\s*string/
    );

    assert.match(
      source,
      /narration:\s*string/
    );

    assert.match(
      source,
      /debit:\s*number/
    );

    assert.match(
      source,
      /credit:\s*number/
    );

    assert.match(
      source,
      /runningBalance:\s*number/
    );

    assert.match(
      source,
      /balanceType:\s*DebitCredit/
    );

    assert.match(
      source,
      /interface\s+OutstandingAccount/
    );

    assert.match(
      source,
      /accountId:\s*string/
    );

    assert.match(
      source,
      /accountCode:\s*string/
    );

    assert.match(
      source,
      /accountName:\s*string/
    );

    assert.match(
      source,
      /accountType:[\s\S]*?['"]accounts_receivable['"][\s\S]*?\|[\s\S]*?['"]accounts_payable['"]/
    );

    assert.match(
      source,
      /openingBalance:\s*OutstandingBalance/
    );

    assert.match(
      source,
      /debitMovement:\s*number/
    );

    assert.match(
      source,
      /creditMovement:\s*number/
    );

    assert.match(
      source,
      /closingBalance:\s*OutstandingBalance/
    );

    assert.match(
      source,
      /entries:\s*OutstandingEntry\[\]/
    );

    assert.match(
      source,
      /outstanding:\s*number/
    );

    assert.match(
      source,
      /interface\s+OutstandingSection/
    );

    assert.match(
      source,
      /accounts:\s*OutstandingAccount\[\]/
    );

    assert.match(
      source,
      /total:\s*number/
    );

    assert.match(
      source,
      /interface\s+OutstandingReport/
    );

    assert.match(
      source,
      /asOf:\s*string/
    );

    assert.match(
      source,
      /receivables:\s*OutstandingSection/
    );

    assert.match(
      source,
      /payables:\s*OutstandingSection/
    );

  }
);


test(
  "outstanding service uses GET-only endpoint and backend filters",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/services/outstanding.service.ts"
      );

    assert.match(
      source,
      /\/accounting\/outstanding/
    );

    assert.match(
      source,
      /getOutstanding/
    );

    assert.match(
      source,
      /asOf/
    );

    assert.match(
      source,
      /type/
    );

    assert.match(
      source,
      /accountId/
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
  "accounts route loads real OutstandingComponent",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/accounts.routes.ts"
      );

    assert.match(
      source,
      /path:\s*['"]outstanding['"]/
    );

    assert.match(
      source,
      /\.\/pages\/outstanding\/outstanding\.component/
    );

    assert.match(
      source,
      /module\.OutstandingComponent/
    );

  }
);


test(
  "accounts sidebar exposes Outstanding report",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
      );

    assert.match(
      source,
      /label:\s*['"]Outstanding['"]/
    );

    assert.match(
      source,
      /route:\s*['"]\/accounts\/outstanding['"]/
    );

  }
);


test(
  "OutstandingComponent supports as-of type and account filtering",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/outstanding/outstanding.component.ts"
      );

    assert.match(
      source,
      /class\s+OutstandingComponent/
    );

    assert.match(
      source,
      /loadOutstanding/
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
      /asOf/
    );

    assert.match(
      source,
      /type/
    );

    assert.match(
      source,
      /accountId/
    );

    assert.match(
      source,
      /receivableAccounts/
    );

    assert.match(
      source,
      /payableAccounts/
    );

  }
);


test(
  "outstanding template renders receivable payable balances and ledger details",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/outstanding/outstanding.component.html"
      );

    const requiredText = [
      "Outstanding",
      "As Of",
      "Type",
      "Account",
      "Total Receivable",
      "Total Payable",
      "Receivables",
      "Payables",
      "Account Code",
      "Account Name",
      "Opening Balance",
      "Debit Movement",
      "Credit Movement",
      "Closing Balance",
      "Journal Date",
      "Journal Number",
      "Narration",
      "Running Balance"
    ];

    for (
      const text
      of requiredText
    ) {

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