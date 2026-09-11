import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);

const adminTs = readFileSync(
  resolve(
    frontendRoot,
    'src/app/features/company-admin/company-admin-dashboard.component.ts'
  ),
  'utf8'
);

const adminHtml = readFileSync(
  resolve(
    frontendRoot,
    'src/app/features/company-admin/company-admin-dashboard.component.html'
  ),
  'utf8'
);

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const embeddedSections = [
  {
    id: 'accounts-customers',
    className: 'CustomersComponent',
    importPath: '../accounts/pages/customers/customers.component',
    selector: 'app-customers'
  },
  {
    id: 'accounts-vendors',
    className: 'VendorsComponent',
    importPath: '../accounts/pages/vendors/vendors.component',
    selector: 'app-vendors'
  },
  {
    id: 'accounts-sales-invoices',
    className: 'SalesInvoicesComponent',
    importPath: '../accounts/pages/sales-invoices/sales-invoices.component',
    selector: 'app-sales-invoices'
  },
  {
    id: 'accounts-receipts',
    className: 'VoucherEntryComponent',
    importPath: '../accounts/pages/voucher-entry/voucher-entry.component',
    selector: 'app-voucher-entry',
    attribute: 'embeddedVoucherType="receipt"'
  },
  {
    id: 'accounts-credit-notes',
    className: 'VoucherEntryComponent',
    importPath: '../accounts/pages/voucher-entry/voucher-entry.component',
    selector: 'app-voucher-entry',
    attribute: 'embeddedVoucherType="credit_note"'
  },
  {
    id: 'accounts-purchase-bills',
    className: 'PurchaseBillsComponent',
    importPath: '../accounts/pages/purchase-bills/purchase-bills.component',
    selector: 'app-purchase-bills'
  },
  {
    id: 'accounts-payments',
    className: 'VoucherEntryComponent',
    importPath: '../accounts/pages/voucher-entry/voucher-entry.component',
    selector: 'app-voucher-entry',
    attribute: 'embeddedVoucherType="payment"'
  },
  {
    id: 'accounts-debit-notes',
    className: 'VoucherEntryComponent',
    importPath: '../accounts/pages/voucher-entry/voucher-entry.component',
    selector: 'app-voucher-entry',
    attribute: 'embeddedVoucherType="debit_note"'
  },
  {
    id: 'accounts-expenses',
    className: 'ExpenseRegisterComponent',
    importPath: '../accounts/pages/expense-register/expense-register.component',
    selector: 'app-expense-register'
  },
  {
    id: 'accounts-journal',
    className: 'JournalEntriesComponent',
    importPath: '../accounts/pages/journal-entries/journal-entries.component',
    selector: 'app-journal-entries'
  },
  {
    id: 'accounts-general-ledger',
    className: 'GeneralLedgerComponent',
    importPath: '../accounts/pages/general-ledger/general-ledger.component',
    selector: 'app-general-ledger'
  },
  {
    id: 'accounts-customer-ledger',
    className: 'PartyLedgerComponent',
    importPath: '../accounts/pages/party-ledger/party-ledger.component',
    selector: 'app-party-ledger',
    attribute: 'embeddedPartyType="customer"'
  },
  {
    id: 'accounts-vendor-ledger',
    className: 'PartyLedgerComponent',
    importPath: '../accounts/pages/party-ledger/party-ledger.component',
    selector: 'app-party-ledger',
    attribute: 'embeddedPartyType="vendor"'
  },
  {
    id: 'accounts-cash-bank',
    className: 'CashBankBookComponent',
    importPath: '../accounts/pages/cash-bank-book/cash-bank-book.component',
    selector: 'app-cash-bank-book'
  },
  {
    id: 'accounts-tax',
    className: 'TaxHubComponent',
    importPath: '../accounts/pages/tax-hub/tax-hub.component',
    selector: 'app-tax-hub'
  },
  {
    id: 'accounts-financial-reports',
    className: 'FinancialReportsHubComponent',
    importPath: '../accounts/pages/financial-reports-hub/financial-reports-hub.component',
    selector: 'app-financial-reports-hub'
  },
  {
    id: 'accounts-settings',
    className: 'AccountsSettingsComponent',
    importPath: '../accounts/pages/accounts-settings/accounts-settings.component',
    selector: 'app-accounts-settings'
  }
];

test(
  'Company Admin renders all Accounts sections inside the existing dashboard shell',
  () => {
    assert.doesNotMatch(
      adminTs,
      /COMPANY_ADMIN_ACCOUNTS_ROUTES/,
      'Company Admin must not navigate Accounts sections away to standalone routes'
    );

    assert.doesNotMatch(
      adminTs,
      /accountsRoute/,
      'Temporary Accounts route mapping must be removed'
    );

    assert.doesNotMatch(
      adminHtml,
      /Managed inside Accounts/,
      'Accounts placeholder must be replaced by embedded components'
    );

    const componentDecorator = adminTs.slice(
      adminTs.indexOf('@Component({'),
      adminTs.indexOf('export class CompanyAdminDashboardComponent')
    );

    const importsBlock =
      componentDecorator.match(/imports:\s*\[[\s\S]*?\]\s*,/s)?.[0] ?? '';

    assert.notEqual(
      importsBlock,
      '',
      'Company Admin component imports block was not found'
    );

    const importedClasses = new Set();

    for (const section of embeddedSections) {
      const importPattern = new RegExp(
        `import\\s*\\{\\s*${escapeRegExp(section.className)}\\s*\\}\\s*from\\s*['"]${escapeRegExp(section.importPath)}['"]`,
        's'
      );

      assert.match(
        adminTs,
        importPattern,
        `${section.className} import is missing`
      );

      importedClasses.add(section.className);

      assert.match(
        importsBlock,
        new RegExp(`\\b${escapeRegExp(section.className)}\\b`),
        `${section.className} is missing from the standalone component imports array`
      );

      assert.match(
        adminHtml,
        new RegExp(
          `activeSection\\(\\)\\s*===\\s*['"]${escapeRegExp(section.id)}['"]`
        ),
        `${section.id} does not have an embedded Company Admin section`
      );

      assert.match(
        adminHtml,
        new RegExp(`<${escapeRegExp(section.selector)}(?:\\s|>)`),
        `${section.selector} is not rendered`
      );

      if (section.attribute) {
        assert.match(
          adminHtml,
          new RegExp(
            `<${escapeRegExp(section.selector)}[\\s\\S]*?${escapeRegExp(section.attribute)}`,
            's'
          ),
          `${section.id} does not preserve its route-specific configuration`
        );
      }
    }

    assert.equal(
      importedClasses.size,
      13,
      'Expected all Accounts component classes to be embedded'
    );
  }
);