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
  'src/app/features/accounts/pages/financial-reports-hub/financial-reports-hub.component.ts';

const componentHtmlPath =
  'src/app/features/accounts/pages/financial-reports-hub/financial-reports-hub.component.html';

const componentScssPath =
  'src/app/features/accounts/pages/financial-reports-hub/financial-reports-hub.component.scss';


test(
  'accounts reports route loads FinancialReportsHubComponent instead of placeholder',
  () => {
    const routes = read(routesPath);

    assert.match(
      routes,
      /path:\s*'reports'[\s\S]*?pages\/financial-reports-hub\/financial-reports-hub\.component[\s\S]*?module\.FinancialReportsHubComponent/
    );

    const reportsRouteMatch =
      routes.match(
        /path:\s*'reports'[\s\S]*?\n\s*},/
      );

    assert.ok(
      reportsRouteMatch,
      'Reports route block was not found'
    );

    assert.doesNotMatch(
      reportsRouteMatch[0],
      /AccountsPlaceholderComponent/
    );
  }
);


test(
  'financial reports hub component files exist',
  () => {
    assert.equal(
      exists(componentTsPath),
      true,
      'Financial reports hub TypeScript component is missing'
    );

    assert.equal(
      exists(componentHtmlPath),
      true,
      'Financial reports hub template is missing'
    );

    assert.equal(
      exists(componentScssPath),
      true,
      'Financial reports hub stylesheet is missing'
    );
  }
);


test(
  'financial reports hub links to all existing report screens',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    const expectedRoutes = [
      '/accounts/trial-balance',
      '/accounts/profit-and-loss',
      '/accounts/balance-sheet',
      '/accounts/cash-bank',
      '/accounts/outstanding',
      '/accounts/gst-report'
    ];

    for (const route of expectedRoutes) {
      assert.ok(
        source.includes(route),
        `Missing report route: ${route}`
      );
    }

    assert.ok(
      template.includes('Financial Reports'),
      'Financial Reports heading is missing'
    );

    const expectedLabels = [
      'Trial Balance',
      'Profit & Loss',
      'Balance Sheet',
      'Cash & Bank',
      'Outstanding',
      'GST Report'
    ];

    for (const label of expectedLabels) {
      assert.ok(
        source.includes(`title: '${label}'`),
        `Missing report definition: ${label}`
      );
    }

    assert.match(
      template,
      /\{\{\s*report\.title\s*\}\}/
    );
  }
);


test(
  'financial reports hub does not invent unsupported cash flow or duplicate report APIs',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.doesNotMatch(
      source,
      /ApiService|HttpClient|TrialBalanceService|ProfitLossService|BalanceSheetService|CashBankBookService|OutstandingService|GstReportService/
    );

    assert.doesNotMatch(
      source,
      /\/accounting\//
    );

    assert.doesNotMatch(
      template,
      /\bCash Flow\b/
    );
  }
);


test(
  'financial reports hub is navigation and information only',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.doesNotMatch(
      source,
      /create|update|delete|post|patch/i
    );

    assert.doesNotMatch(
      template,
      /Save|Create Report|Edit Report|Delete Report/
    );

    assert.match(
      template,
      /individual report screens/i
    );
  }
);