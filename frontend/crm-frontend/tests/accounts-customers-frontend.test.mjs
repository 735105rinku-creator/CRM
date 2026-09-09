import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, 'utf8')
    : '';

const models = read(
  'src/app/features/accounts/models/accounts.models.ts'
);

const service = read(
  'src/app/features/accounts/services/account-party.service.ts'
);

const routes = read(
  'src/app/features/accounts/accounts.routes.ts'
);

const component = read(
  'src/app/features/accounts/pages/customers/customers.component.ts'
);

const template = read(
  'src/app/features/accounts/pages/customers/customers.component.html'
);

test(
  'accounts models define customer/vendor party contract',
  () => {
    assert.match(models, /export\s+type\s+AccountPartyType/);
    assert.match(models, /export\s+interface\s+AccountParty/);
    assert.match(models, /export\s+interface\s+CreateAccountPartyPayload/);
    assert.match(models, /export\s+interface\s+UpdateAccountPartyPayload/);
  }
);

test(
  'account party service uses dedicated accounting customer endpoints',
  () => {
    assert.match(
      service,
      /\/accounting\/customers/
    );

    assert.match(
      service,
      /getCustomers\s*\(/
    );

    assert.match(
      service,
      /createCustomer\s*\(/
    );

    assert.match(
      service,
      /updateCustomer\s*\(/
    );

    assert.doesNotMatch(
      service,
      /deleteCustomer\s*\(/
    );
  }
);

test(
  'customer route loads real CustomersComponent instead of placeholder',
  () => {
    assert.match(
      routes,
      /\.\/pages\/customers\/customers\.component/
    );

    assert.match(
      routes,
      /CustomersComponent/
    );
  }
);

test(
  'customers component supports list create edit and status management',
  () => {
    assert.match(component, /export\s+class\s+CustomersComponent/);
    assert.match(component, /loadCustomers\s*\(/);
    assert.match(component, /openCreateForm\s*\(/);
    assert.match(component, /openEditForm\s*\(/);
    assert.match(component, /saveCustomer\s*\(/);
    assert.match(component, /toggleStatus\s*\(/);
  }
);

test(
  'customers template exposes accounting customer master UI',
  () => {
    assert.match(template, /Customers/i);
    assert.match(template, /Add Customer/i);
    assert.match(template, /Account Code/i);
    assert.match(template, /Opening Balance/i);
    assert.match(template, /Active/i);
  }
);