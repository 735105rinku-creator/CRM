import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const routesPath = path.join(
  root,
  'src/app/features/accounts/accounts.routes.ts'
);

const sidebarPath = path.join(
  root,
  'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'
);

const modelPath = path.join(
  root,
  'src/app/features/accounts/models/accounts.models.ts'
);

const servicePath = path.join(
  root,
  'src/app/features/accounts/services/day-book.service.ts'
);

const componentDir = path.join(
  root,
  'src/app/features/accounts/pages/day-book'
);

const componentPath = path.join(
  componentDir,
  'day-book.component.ts'
);

const htmlPath = path.join(
  componentDir,
  'day-book.component.html'
);

const scssPath = path.join(
  componentDir,
  'day-book.component.scss'
);

const routes = fs.readFileSync(routesPath, 'utf8');
const sidebar = fs.readFileSync(sidebarPath, 'utf8');

test('Day Book route loads dedicated component', () => {
  assert.match(
    routes,
    /path:\s*'day-book'/
  );

  assert.match(
    routes,
    /pages\/day-book\/day-book\.component/
  );

  assert.match(
    routes,
    /DayBookComponent/
  );
});

test('Accounting sidebar exposes Day Book', () => {
  assert.match(
    sidebar,
    /label:\s*'Day Book'/
  );

  assert.match(
    sidebar,
    /route:\s*'\/accounts\/day-book'/
  );
});

test('Day Book frontend files exist', () => {
  for (const file of [
    servicePath,
    componentPath,
    htmlPath,
    scssPath
  ]) {
    assert.equal(
      fs.existsSync(file),
      true,
      `Missing ${path.relative(root, file)}`
    );
  }
});

test('Day Book models match backend read contract', () => {
  const source =
    fs.readFileSync(modelPath, 'utf8');

  for (const name of [
    'DayBookReport',
    'DayBookRow',
    'DayBookLine',
    'DayBookSummary',
    'DayBookPagination'
  ]) {
    assert.match(
      source,
      new RegExp(`interface\\s+${name}\\b`)
    );
  }

  for (const field of [
    'journalEntryId',
    'displayType',
    'voucherType',
    'voucherNumber',
    'journalNumber',
    'referenceType',
    'referenceNo',
    'narration',
    'totalDebit',
    'totalCredit',
    'lines'
  ]) {
    assert.match(
      source,
      new RegExp(`\\b${field}\\??\\s*:`)
    );
  }
});

test('Day Book service uses only existing GET endpoint and supported query fields', () => {
  const source =
    fs.readFileSync(servicePath, 'utf8');

  assert.match(
    source,
    /['"]\/accounting\/day-book['"]/
  );

  assert.match(
    source,
    /\.get<DayBookReport>/
  );

  for (const field of [
    'from',
    'to',
    'voucherType',
    'sort',
    'page',
    'limit'
  ]) {
    assert.match(
      source,
      new RegExp(`\\b${field}:\\s*query\\.${field}`)
    );
  }

  assert.doesNotMatch(
    source,
    /\.post|\.patch|\.put|\.delete/
  );
});

test('Day Book screen exposes backend-supported filters and voucher types', () => {
  const ts =
    fs.readFileSync(componentPath, 'utf8');

  const html =
    fs.readFileSync(htmlPath, 'utf8');

  for (const type of [
    'journal',
    'payment',
    'receipt',
    'contra',
    'sales',
    'purchase',
    'credit_note',
    'debit_note'
  ]) {
    assert.match(
      ts,
      new RegExp(`value:\\s*'${type}'`)
    );
  }

  assert.match(html, /Day Book/i);
  assert.match(html, /From/i);
  assert.match(html, /To/i);
  assert.match(html, /Voucher Type/i);
  assert.match(html, /Sort/i);
});

test('Day Book screen exposes summary and transaction columns', () => {
  const html =
    fs.readFileSync(htmlPath, 'utf8');

  for (const text of [
    'Voucher Count',
    'Total Debit',
    'Total Credit',
    'Date',
    'Voucher Type',
    'Voucher No.',
    'Reference',
    'Narration',
    'Debit',
    'Credit'
  ]) {
    assert.match(
      html,
      new RegExp(
        text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      )
    );
  }
});

test('Day Book screen supports backend pagination without write actions', () => {
  const ts =
    fs.readFileSync(componentPath, 'utf8');

  const html =
    fs.readFileSync(htmlPath, 'utf8');

  assert.match(ts, /page\s*=\s*1/);
  assert.match(ts, /limit\s*=\s*25/);

  assert.match(html, /Previous/i);
  assert.match(html, /Next/i);

  assert.doesNotMatch(
    `${ts}\n${html}`,
    /Create Voucher|Post Voucher|Void Voucher|Delete Voucher/
  );
});