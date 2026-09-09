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
  "cash bank models match backend report contract",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/models/accounts.models.ts"
      );

    assert.match(
      source,
      /interface\s+CashBankBalance/
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
      /interface\s+CashBankEntry/
    );

    assert.match(
      source,
      /journalDate:\s*string/
    );

    assert.match(
      source,
      /journalNumber:\s*string/
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
      /interface\s+CashBankAccount/
    );

    assert.match(
      source,
      /accountType:\s*['"]cash['"]\s*\|\s*['"]bank['"]/
    );

    assert.match(
      source,
      /openingBalance:\s*CashBankBalance/
    );

    assert.match(
      source,
      /entries:\s*CashBankEntry\[\]/
    );

    assert.match(
      source,
      /totalDebit:\s*number/
    );

    assert.match(
      source,
      /totalCredit:\s*number/
    );

    assert.match(
      source,
      /closingBalance:\s*CashBankBalance/
    );

    assert.match(
      source,
      /interface\s+CashBankSummary/
    );

    assert.match(
      source,
      /totalAccounts:\s*number/
    );

    assert.match(
      source,
      /totalOpening:\s*number/
    );

    assert.match(
      source,
      /totalClosing:\s*number/
    );

    assert.match(
      source,
      /interface\s+CashBankBookReport/
    );

    assert.match(
      source,
      /accounts:\s*CashBankAccount\[\]/
    );

    assert.match(
      source,
      /summary:\s*CashBankSummary/
    );

  }
);


test(
  "cash bank service uses GET-only accounting endpoint and filters",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/services/cash-bank-book.service.ts"
      );

    assert.match(
      source,
      /\/accounting\/cash-bank-book/
    );

    assert.match(
      source,
      /getCashBankBook/
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
  "accounts cash bank route loads real CashBankBookComponent",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/accounts.routes.ts"
      );

    assert.match(
      source,
      /path:\s*['"]cash-bank['"]/
    );

    assert.match(
      source,
      /\.\/pages\/cash-bank-book\/cash-bank-book\.component/
    );

    assert.match(
      source,
      /module\.CashBankBookComponent/
    );

  }
);


test(
  "accounts sidebar keeps Cash & Bank workspace",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
      );

    assert.match(
      source,
      /label:\s*['"]Cash & Bank['"]/
    );

    assert.match(
      source,
      /route:\s*['"]\/accounts\/cash-bank['"]/
    );

  }
);


test(
  "CashBankBookComponent supports period and account filtering",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/cash-bank-book/cash-bank-book.component.ts"
      );

    assert.match(
      source,
      /class\s+CashBankBookComponent/
    );

    assert.match(
      source,
      /loadCashBankBook/
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
      /selectedAccountId/
    );

    assert.match(
      source,
      /selectedAccount/
    );

    assert.match(
      source,
      /financialYearRange/
    );

  }
);


test(
  "cash bank template renders summary accounts and ledger entries",
  async () => {

    const source =
      await read(
        "src/app/features/accounts/pages/cash-bank-book/cash-bank-book.component.html"
      );

    const requiredText = [
      "Cash & Bank Book",
      "From Date",
      "To Date",
      "Account",
      "Total Accounts",
      "Opening Balance",
      "Total Debit",
      "Total Credit",
      "Closing Balance",
      "Account Code",
      "Account Name",
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