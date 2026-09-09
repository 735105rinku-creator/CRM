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
  'src/app/features/accounts/pages/tax-hub/tax-hub.component.ts';

const componentHtmlPath =
  'src/app/features/accounts/pages/tax-hub/tax-hub.component.html';

const componentScssPath =
  'src/app/features/accounts/pages/tax-hub/tax-hub.component.scss';


test(
  'accounts tax route loads the real TaxHubComponent',
  () => {
    const routes = read(routesPath);

    assert.match(
      routes,
      /path:\s*'tax'[\s\S]*?pages\/tax-hub\/tax-hub\.component[\s\S]*?module\.TaxHubComponent/
    );

    const taxRouteMatch =
      routes.match(
        /path:\s*'tax'[\s\S]*?\n\s*},/
      );

    assert.ok(
      taxRouteMatch,
      'Tax route block was not found'
    );

    assert.doesNotMatch(
      taxRouteMatch[0],
      /AccountsPlaceholderComponent/
    );
  }
);


test(
  'tax hub component files exist',
  () => {
    assert.equal(
      exists(componentTsPath),
      true,
      'Tax hub TypeScript component is missing'
    );

    assert.equal(
      exists(componentHtmlPath),
      true,
      'Tax hub template is missing'
    );

    assert.equal(
      exists(componentScssPath),
      true,
      'Tax hub stylesheet is missing'
    );
  }
);


test(
  'tax hub exposes the existing GST report without creating a duplicate tax API',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.match(
      source,
      /\/accounts\/gst-report/
    );

    assert.match(
      template,
      /GST Report/
    );

    assert.match(
      template,
      /Open GST Report/
    );

    assert.doesNotMatch(
      source,
      /\/accounting\/tax|\/accounting\/tds/
    );

    assert.doesNotMatch(
      source,
      /ApiService|HttpClient|GstReportService/
    );
  }
);


test(
  'tax hub clearly distinguishes implemented GST from unconfigured statutory taxes',
  () => {
    const template = read(componentHtmlPath);

    const expectedText = [
      'GST & Tax',
      'Output GST',
      'Input GST',
      'Net GST Position',
      'TDS',
      'Other Statutory Taxes',
      'Available',
      'Not configured'
    ];

    for (const text of expectedText) {
      assert.ok(
        template.includes(text),
        `Missing tax hub text: ${text}`
      );
    }

    assert.doesNotMatch(
      template,
      /dummy|sample tax|fake/i
    );
  }
);


test(
  'tax hub remains navigation and information only',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.doesNotMatch(
      source,
      /create|update|delete|post|patch/i
    );

    assert.doesNotMatch(
      template,
      /Save|Create Tax|Edit Tax|Delete Tax|Add TDS/
    );
  }
);