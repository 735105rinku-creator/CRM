import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const routes = read(
  'src/app/features/accounts/accounts.routes.ts'
);

const sidebarTs = read(
  'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'
);

const sidebarHtml = read(
  'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.html'
);

const models = read(
  'src/app/features/accounts/models/accounts.models.ts'
);

const service = read(
  'src/app/features/accounts/services/general-ledger.service.ts'
);

const component = read(
  'src/app/features/accounts/pages/general-ledger/general-ledger.component.ts'
);

const template = read(
  'src/app/features/accounts/pages/general-ledger/general-ledger.component.html'
);

test(
  'general ledger service uses existing read-only list and account-ledger endpoints',
  () => {
    assert.match(
      service,
      /private readonly basePath\s*=\s*['"]\/accounting\/general-ledger['"]/
    );

    assert.match(
      service,
      /getGeneralLedger\s*\(/
    );

    assert.match(
      service,
      /\.get<GeneralLedgerResponse>/
    );

    assert.match(
      service,
      /getAccountLedger\s*\(/
    );

    assert.match(
      service,
      /\$\{this\.basePath\}\/\$\{encodeURIComponent/
    );

    assert.doesNotMatch(
      service,
      /\.(post|put|patch|delete)\s*</i
    );
  }
);

test(
  'accounts route loads the real GeneralLedgerComponent',
  () => {
    assert.match(
      routes,
      /path:\s*['"]ledger['"]/
    );

    assert.match(
      routes,
      /pages\/general-ledger\/general-ledger\.component/
    );

    assert.match(
      routes,
      /module\.GeneralLedgerComponent/
    );
  }
);

test(
  'accounts sidebar exposes General Ledger',
  () => {
    const combinedSidebar = `${sidebarTs}\n${sidebarHtml}`;

    assert.match(
      combinedSidebar,
      /General Ledger/i
    );

    assert.match(
      combinedSidebar,
      /ledger/i
    );
  }
);

test(
  'general ledger models expose account summary balances',
  () => {
    assert.match(
      models,
      /interface\s+LedgerBalance/
    );

    assert.match(
      models,
      /amount:\s*number/
    );

    assert.match(
      models,
      /type:/
    );

    assert.match(
      models,
      /interface\s+GeneralLedgerAccount/
    );

    assert.match(
      models,
      /openingBalance:\s*LedgerBalance/
    );

    assert.match(
      models,
      /closingBalance:\s*LedgerBalance/
    );

    assert.match(
      models,
      /totalDebit:\s*number/
    );

    assert.match(
      models,
      /totalCredit:\s*number/
    );
  }
);

test(
  'general ledger component renders opening movement and closing balances',
  () => {
    assert.match(
      component,
      /getGeneralLedger\s*\(/
    );

    assert.match(
      component,
      /totalOpeningDebit/
    );

    assert.match(
      component,
      /totalOpeningCredit/
    );

    assert.match(
      component,
      /totalClosingDebit/
    );

    assert.match(
      component,
      /totalClosingCredit/
    );

    assert.match(
      template,
      /Opening Balance/i
    );

    assert.match(
      template,
      /Closing Balance/i
    );

    assert.match(
      template,
      /account\.totalDebit/
    );

    assert.match(
      template,
      /account\.totalCredit/
    );
  }
);

test(
  'general ledger frontend exposes account-wise transaction drill-down with running balances',
  () => {
    assert.match(
      component,
      /getAccountLedger\s*\(/
    );

    assert.match(
      component,
      /selectedAccount/
    );

    assert.match(
      component,
      /ledgerEntries/
    );

    assert.match(
      template,
      /Running Balance/i
    );

    assert.match(
      template,
      /ledgerEntries/
    );
  }
);

test(
  'general ledger renders account ledger detail directly below the selected account row',
  () => {
    const accountLoopIndex =
      template.indexOf('trackBy: trackAccount');

    const mainTableBodyCloseIndex =
      template.indexOf(
        '</tbody>',
        accountLoopIndex
      );

    const detailIndex =
      template.indexOf(
        'Account Ledger Detail'
      );

    assert.notEqual(
      accountLoopIndex,
      -1,
      'account row loop must exist'
    );

    assert.notEqual(
      mainTableBodyCloseIndex,
      -1,
      'main General Ledger tbody must exist'
    );

    assert.notEqual(
      detailIndex,
      -1,
      'Account Ledger Detail must exist'
    );

    assert.ok(
      detailIndex > accountLoopIndex &&
      detailIndex < mainTableBodyCloseIndex,
      'Account Ledger Detail must be rendered inside the account-row loop before the main tbody closes'
    );

    assert.match(
      component,
      /isSelectedAccount\s*\(/
    );

    assert.match(
      template,
      /isSelectedAccount\s*\(\s*account\s*\)/
    );
  }
);
