import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, 'utf8')
    : '';

const service = read(
  'src/app/features/accounts/services/account-party.service.ts'
);

const routes = read(
  'src/app/features/accounts/accounts.routes.ts'
);

const component = read(
  'src/app/features/accounts/pages/vendors/vendors.component.ts'
);

const template = read(
  'src/app/features/accounts/pages/vendors/vendors.component.html'
);

test(
  'account party service exposes dedicated accounting vendor endpoints',
  () => {
    assert.match(
      service,
      /\/accounting\/vendors/
    );

    assert.match(
      service,
      /getVendors\s*\(/
    );

    assert.match(
      service,
      /createVendor\s*\(/
    );

    assert.match(
      service,
      /updateVendor\s*\(/
    );

    assert.doesNotMatch(
      service,
      /deleteVendor\s*\(/
    );
  }
);

test(
  'vendor route loads real VendorsComponent instead of placeholder',
  () => {
    assert.match(
      routes,
      /\.\/pages\/vendors\/vendors\.component/
    );

    assert.match(
      routes,
      /VendorsComponent/
    );
  }
);

test(
  'vendors component supports list create edit and status management',
  () => {
    assert.match(
      component,
      /export\s+class\s+VendorsComponent/
    );

    assert.match(
      component,
      /loadVendors\s*\(/
    );

    assert.match(
      component,
      /openCreateForm\s*\(/
    );

    assert.match(
      component,
      /openEditForm\s*\(/
    );

    assert.match(
      component,
      /saveVendor\s*\(/
    );

    assert.match(
      component,
      /toggleStatus\s*\(/
    );
  }
);

test(
  'vendors template exposes accounting vendor master UI',
  () => {
    assert.match(template, /Vendors/i);
    assert.match(template, /Add Vendor/i);
    assert.match(template, /Account Code/i);
    assert.match(template, /Opening Balance/i);
    assert.match(template, /Payable Balance/i);
    assert.match(template, /totalPayable\s*\(\s*\)/);
    assert.doesNotMatch(template, /totalReceivable\s*\(\s*\)/);
    assert.match(template, /e\.g\.\s*VEND001/i);
    assert.doesNotMatch(template, /e\.g\.\s*CUST001/i);
    assert.match(template, /Active/i);
  }
);