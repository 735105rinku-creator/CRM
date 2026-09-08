import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const sidebarPath = path.join(
  root,
  'src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'
);

const routesPath = path.join(
  root,
  'src/app/features/accounts/accounts.routes.ts'
);

const sidebar = fs.readFileSync(sidebarPath, 'utf8');
const routes = fs.readFileSync(routesPath, 'utf8');

test('GST and Tax Hub route exists', () => {
  assert.match(
    routes,
    /path:\s*'tax'/
  );

  assert.match(
    routes,
    /TaxHubComponent/
  );
});

test('GST Report route remains available', () => {
  assert.match(
    routes,
    /path:\s*'gst-report'/
  );

  assert.match(
    sidebar,
    /route:\s*'\/accounts\/gst-report'/
  );
});

test('Tax sidebar exposes GST and Tax Hub', () => {
  assert.match(
    sidebar,
    /label:\s*'GST & Tax'/
  );

  assert.match(
    sidebar,
    /route:\s*'\/accounts\/tax'/
  );
});

test('Tax sidebar keeps both Tax Hub and GST Report', () => {
  const taxSectionMatch = sidebar.match(
    /title:\s*'Tax'[\s\S]*?items:\s*\[([\s\S]*?)\]\s*\n\s*}/
  );

  assert.ok(
    taxSectionMatch,
    'Tax sidebar section should exist'
  );

  const taxSection = taxSectionMatch[1];

  assert.match(
    taxSection,
    /label:\s*'GST & Tax'/
  );

  assert.match(
    taxSection,
    /route:\s*'\/accounts\/tax'/
  );

  assert.match(
    taxSection,
    /label:\s*'GST Report'/
  );

  assert.match(
    taxSection,
    /route:\s*'\/accounts\/gst-report'/
  );
});