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
  'src/app/features/accounts/pages/expense-register/expense-register.component.ts';

const componentHtmlPath =
  'src/app/features/accounts/pages/expense-register/expense-register.component.html';

const componentScssPath =
  'src/app/features/accounts/pages/expense-register/expense-register.component.scss';

const servicePath =
  'src/app/features/accounts/services/account-expense.service.ts';


test(
  'accounts expenses route loads the real ExpenseRegisterComponent',
  () => {
    const routes = read(routesPath);

    assert.match(
      routes,
      /path:\s*'expenses'[\s\S]*?pages\/expense-register\/expense-register\.component[\s\S]*?module\.ExpenseRegisterComponent/
    );

    const expenseRouteMatch =
      routes.match(
        /path:\s*'expenses'[\s\S]*?\n\s*},/
      );

    assert.ok(
      expenseRouteMatch,
      'Expenses route block was not found'
    );

    assert.doesNotMatch(
      expenseRouteMatch[0],
      /AccountsPlaceholderComponent/
    );
  }
);


test(
  'expense register component files exist',
  () => {
    assert.equal(
      exists(componentTsPath),
      true,
      'Expense register TypeScript component is missing'
    );

    assert.equal(
      exists(componentHtmlPath),
      true,
      'Expense register template is missing'
    );

    assert.equal(
      exists(componentScssPath),
      true,
      'Expense register stylesheet is missing'
    );
  }
);


test(
  'expense register keeps financial records read-only while allowing proof attachment lifecycle',
  () => {
    assert.equal(
      exists(servicePath),
      true,
      'Account expense service is missing'
    );

    const service = read(servicePath);

    assert.match(
      service,
      /\/accounting\/expenses/
    );

    assert.match(
      service,
      /\.get\s*</
    );

    assert.doesNotMatch(
      service,
      /\.patch\s*</
    );

    assert.doesNotMatch(
      service,
      /\.put\s*</
    );

    assert.match(
      service,
      /\.post\s*<AccountExpenseRecord>/
    );

    assert.match(
      service,
      /\/attachments`/
    );

    assert.match(
      service,
      /\.delete\s*<AccountExpenseRecord>/
    );

    assert.match(
      service,
      /\/attachments\/\$\{this\.encodeId\(attachmentId\)\}`/
    );

    assert.doesNotMatch(
      service,
      /\.post\s*<[^>]+>\s*\(\s*this\.basePath/
    );
  }
);

test(
  'expense register component supports read-only loading and filtering',
  () => {
    const source = read(componentTsPath);

    assert.match(
      source,
      /AccountExpenseService/
    );

    assert.match(
      source,
      /loadExpenses/
    );

    assert.match(
      source,
      /search/
    );

    assert.match(
      source,
      /status/
    );

    assert.match(
      source,
      /category/
    );

    assert.match(
      source,
      /fromDate/
    );

    assert.match(
      source,
      /toDate/
    );

    assert.doesNotMatch(
      source,
      /createExpense|updateExpense|deleteExpense/
    );
  }
);


test(
  'expense register template exposes approved operational expense fields',
  () => {
    const template = read(componentHtmlPath);

    const expectedText = [
      'Operational Expense Register',
      'Total Expenses',
      'Pending',
      'Approved',
      'Expense Date',
      'Title',
      'Category',
      'Expense Type',
      'Business Category',
      'Route Type',
      'Assigned Employee',
      'Amount',
      'Status',
      'Notes'
    ];

    for (const text of expectedText) {
      assert.ok(
        template.includes(text),
        `Missing template text: ${text}`
      );
    }

    assert.match(
      template,
      /accounting posting is handled separately through vouchers\/journals/i
    );

    assert.doesNotMatch(
      template,
      /Save|Create Expense|Edit Expense|Delete|Approve Expense|Reject Expense/
    );
  }
);


test(
  'expense register remains isolated to Accounts frontend scope',
  () => {
    const service = read(servicePath);
    const source = read(componentTsPath);

    assert.doesNotMatch(
      service,
      /company-admin|employee-dashboard|hr-dashboard/
    );

    assert.doesNotMatch(
      source,
      /company-admin|employee-dashboard|hr-dashboard/
    );
  }
);