import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (relativePath) =>
  fs.readFileSync(
    path.join(root, relativePath),
    'utf8'
  );

const exists = (relativePath) =>
  fs.existsSync(
    path.join(root, relativePath)
  );

const routesPath =
  'src/app/features/accounts/accounts.routes.ts';

const componentTsPath =
  'src/app/features/accounts/pages/party-ledger/party-ledger.component.ts';

const componentHtmlPath =
  'src/app/features/accounts/pages/party-ledger/party-ledger.component.html';

const componentScssPath =
  'src/app/features/accounts/pages/party-ledger/party-ledger.component.scss';

const partyServicePath =
  'src/app/features/accounts/services/account-party.service.ts';

const ledgerServicePath =
  'src/app/features/accounts/services/general-ledger.service.ts';


test(
  'customer and vendor ledger routes use the shared PartyLedgerComponent',
  () => {
    const routes = read(routesPath);

    assert.match(
      routes,
      /path:\s*'ledger\/customers'[\s\S]*?pages\/party-ledger\/party-ledger\.component[\s\S]*?module\.PartyLedgerComponent[\s\S]*?partyType:\s*'customer'/
    );

    assert.match(
      routes,
      /path:\s*'ledger\/vendors'[\s\S]*?pages\/party-ledger\/party-ledger\.component[\s\S]*?module\.PartyLedgerComponent[\s\S]*?partyType:\s*'vendor'/
    );
  }
);


test(
  'shared party ledger component files exist',
  () => {
    assert.equal(
      exists(componentTsPath),
      true,
      'Party ledger TypeScript component is missing'
    );

    assert.equal(
      exists(componentHtmlPath),
      true,
      'Party ledger template is missing'
    );

    assert.equal(
      exists(componentScssPath),
      true,
      'Party ledger stylesheet is missing'
    );
  }
);


test(
  'party ledger reuses existing party and general ledger services',
  () => {
    const source = read(componentTsPath);

    assert.match(
      source,
      /AccountPartyService/
    );

    assert.match(
      source,
      /GeneralLedgerService/
    );

    assert.match(
      source,
      /getCustomers\s*\(/
    );

    assert.match(
      source,
      /getVendors\s*\(/
    );

    assert.match(
      source,
      /getAccountLedger\s*\(/
    );

    assert.match(
      source,
      /ActivatedRoute/
    );
  }
);


test(
  'party ledger supports route mode, party selection and date filters',
  () => {
    const source = read(componentTsPath);

    assert.match(
      source,
      /partyType/
    );

    assert.match(
      source,
      /selectedPartyId/
    );

    assert.match(
      source,
      /fromDate/
    );

    assert.match(
      source,
      /toDate/
    );

    assert.match(
      source,
      /loadParties/
    );

    assert.match(
      source,
      /loadLedger/
    );
  }
);


test(
  'party ledger template exposes read-only ledger information',
  () => {
    const template = read(componentHtmlPath);

    const expectedText = [
      'Opening Balance',
      'Total Debit',
      'Total Credit',
      'Closing Balance',
      'From',
      'To',
      'Debit',
      'Credit',
      'Balance'
    ];

    for (const text of expectedText) {
      assert.ok(
        template.includes(text),
        `Missing template text: ${text}`
      );
    }

    assert.match(
      template,
      /select/i
    );

    assert.doesNotMatch(
      template,
      /Save Draft|Post Voucher|Void Voucher|Delete/
    );
  }
);


test(
  'existing AccountPartyService still provides customer and vendor reads',
  () => {
    const service = read(partyServicePath);

    assert.match(
      service,
      /getCustomers\s*\(/
    );

    assert.match(
      service,
      /getVendors\s*\(/
    );

    assert.match(
      service,
      /\/accounting\/customers/
    );

    assert.match(
      service,
      /\/accounting\/vendors/
    );
  }
);



test(
  'party ledger sends from and to filters through the general ledger service',
  () => {
    const component = read(componentTsPath);
    const service = read(ledgerServicePath);

    assert.match(
      service,
      /from\??:\s*string/
    );

    assert.match(
      service,
      /to\??:\s*string/
    );

    assert.match(
      component,
      /from:\s*this\.fromDate\(\)/
    );

    assert.match(
      component,
      /to:\s*this\.toDate\(\)/
    );

    assert.match(
      component,
      /getAccountLedger\s*\(\s*accountId\s*,/
    );
  }
);

test(
  'existing GeneralLedgerService provides account ledger read endpoint',
  () => {
    const service = read(ledgerServicePath);

    assert.match(
      service,
      /getAccountLedger\s*\(/
    );

    assert.match(
      service,
      /\/accounting\/general-ledger/
    );

    assert.match(
      service,
      /accountId/
    );
  }
);