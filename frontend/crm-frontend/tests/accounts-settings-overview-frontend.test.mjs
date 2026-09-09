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
  'src/app/features/accounts/pages/accounts-settings/accounts-settings.component.ts';

const componentHtmlPath =
  'src/app/features/accounts/pages/accounts-settings/accounts-settings.component.html';

const componentScssPath =
  'src/app/features/accounts/pages/accounts-settings/accounts-settings.component.scss';


test(
  'accounts settings route loads AccountsSettingsComponent instead of placeholder',
  () => {
    const routes = read(routesPath);

    assert.match(
      routes,
      /path:\s*'settings'[\s\S]*?pages\/accounts-settings\/accounts-settings\.component[\s\S]*?module\.AccountsSettingsComponent/
    );

    const settingsRouteMatch =
      routes.match(
        /path:\s*'settings'[\s\S]*?\n\s*},/
      );

    assert.ok(
      settingsRouteMatch,
      'Accounts Settings route block was not found'
    );

    assert.doesNotMatch(
      settingsRouteMatch[0],
      /AccountsPlaceholderComponent/
    );
  }
);


test(
  'accounts settings component files exist',
  () => {
    assert.equal(
      exists(componentTsPath),
      true,
      'Accounts Settings TypeScript component is missing'
    );

    assert.equal(
      exists(componentHtmlPath),
      true,
      'Accounts Settings template is missing'
    );

    assert.equal(
      exists(componentScssPath),
      true,
      'Accounts Settings stylesheet is missing'
    );
  }
);


test(
  'accounts settings overview exposes approved accounting configuration areas',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.ok(
      template.includes('Accounts Settings'),
      'Accounts Settings heading is missing'
    );

    const expectedAreas = [
      'Financial Year',
      'Currency',
      'Voucher Numbering',
      'GST & Tax',
      'Chart of Accounts',
      'Company Configuration'
    ];

    for (const area of expectedAreas) {
      assert.ok(
        source.includes(`title: '${area}'`),
        `Missing settings overview area: ${area}`
      );
    }

    assert.match(
      template,
      /read-only/i
    );
  }
);


test(
  'accounts settings overview links only to existing Accounts configuration workspaces',
  () => {
    const source = read(componentTsPath);

    assert.ok(
      source.includes('/accounts/tax'),
      'Existing GST & Tax workspace route is missing'
    );

    assert.ok(
      source.includes('/accounts/chart-of-accounts'),
      'Existing Chart of Accounts route is missing'
    );

    assert.doesNotMatch(
      source,
      /\/company-admin|\/company-settings/
    );
  }
);


test(
  'accounts settings overview does not invent editable accounting settings or APIs',
  () => {
    const source = read(componentTsPath);
    const template = read(componentHtmlPath);

    assert.doesNotMatch(
      source,
      /ApiService|HttpClient|\/accounting\/|CompanyService|CompanySettingsService/
    );

    assert.doesNotMatch(
      source,
      /create|update|delete|post|patch/i
    );

    assert.doesNotMatch(
      template,
      /<form|<input|<select|<textarea/i
    );

    assert.doesNotMatch(
      template,
      /Save Settings|Save Configuration|Change Currency|Edit Financial Year|Voucher Prefix/
    );
  }
);