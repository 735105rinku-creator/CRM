import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import jwt from "jsonwebtoken";

import app from "../app.js";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

const COMPANY_A = "111111111111111111111111";
const COMPANY_B = "222222222222222222222222";
const USER_ID = "333333333333333333333333";
const EMPLOYEE_ID = "444444444444444444444444";

let server;
let baseUrl;
let currentUser;
let currentDepartment = "Sales";
let currentFeatureKey = "sales";
let employeeFindFilter;
let bankFindFilter;
let identityFindFilter;

function makeUser(role, companyId = COMPANY_A) {
  return {
    _id: USER_ID,
    role,
    status: USER_STATUS.ACTIVE,
    companyId: companyId
      ? { _id: companyId, companyName: "Test Company" }
      : null,
    employeeCode: "EMP001",
    roleRef: null,
    permissions: [],
    isPlatformUser: false,
  };
}

function makeEmployee() {
  return {
    _id: EMPLOYEE_ID,
    companyId: COMPANY_A,
    userId: USER_ID,
    employeeCode: "EMP001",
    firstName: "Test",
    lastName: "Employee",
    officialEmail: "work@example.test",
    personalEmail: "private@example.test",
    mobile: "9000000001",
    alternateMobile: "9000000002",
    emergencyContact: {
      name: "Emergency Person",
      mobile: "9000000003",
    },
    departmentId: {
      departmentName: currentDepartment,
      departmentCode: "",
      featureKey: currentFeatureKey,
    },
    designationId: { designationName: "Executive" },
    employeeStatus: "active",
    isActive: true,
    createdAt: new Date("2026-01-01"),
  };
}

function resetScenario(
  role,
  department = "Sales",
  featureKey = "sales",
  companyId = COMPANY_A
) {
  currentUser = makeUser(role, companyId);
  currentDepartment = department;
  currentFeatureKey = featureKey;
  employeeFindFilter = undefined;
  bankFindFilter = undefined;
  identityFindFilter = undefined;
}

function makeToken() {
  return jwt.sign(
    { sub: USER_ID, role: currentUser.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "10m" }
  );
}

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${makeToken()}` },
    signal: AbortSignal.timeout(10000),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

before(async () => {
  assert.equal(
    process.env.NODE_ENV,
    "test",
    "This test must run in NODE_ENV=test"
  );

  assert.match(
    process.env.MONGO_URI || "",
    /^mongodb:\/\/127\.0\.0\.1:1\//
  );

  mock.method(User, "findById", () => ({
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(currentUser).then(resolve, reject);
    },
  }));

  mock.method(User, "find", () => ({
    select() {
      return this;
    },
    async lean() {
      return [];
    },
  }));

  mock.method(Employee, "findOne", (filter) => {
    identityFindFilter = filter;

    return {
      async populate() {
        return {
          departmentId: {
            departmentName: currentDepartment,
            departmentCode: "",
            featureKey: currentFeatureKey,
          },
        };
      },
    };
  });

  mock.method(Employee, "find", (filter) => {
    employeeFindFilter = filter;

    return {
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      async lean() {
        return [makeEmployee()];
      },
    };
  });

  mock.method(EmployeeBank, "find", (filter) => {
    bankFindFilter = filter;

    return {
      async lean() {
        return [{
          _id: "555555555555555555555555",
          employeeId: EMPLOYEE_ID,
          bankName: "Test Bank",
          accountNumber: "TEST-ACCOUNT-123",
          ifscCode: "TEST0000001",
        }];
      },
    };
  });

  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => {
      resolve(instance);
    });
    instance.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  mock.restoreAll();
});

test("Company Admin receives private employee contacts", async () => {
  resetScenario(ROLES.COMPANY_ADMIN);

  const { status, body } = await request("/crm/contacts");

  assert.equal(status, 200);
  assert.equal(body.data.contacts.length, 1);
  assert.equal(
    body.data.contacts[0].personalEmail,
    "private@example.test"
  );
  assert.equal(
    body.data.contacts[0].emergencyContact.mobile,
    "9000000003"
  );
  assert.equal(employeeFindFilter.companyId, COMPANY_A);
});

test("HR receives private employee contacts", async () => {
  resetScenario(ROLES.HR);

  const { status, body } = await request("/crm/contacts");

  assert.equal(status, 200);
  assert.equal(
    body.data.contacts[0].alternateMobile,
    "9000000002"
  );
});

test("Sales employee cannot receive private contacts", async () => {
  resetScenario(ROLES.EMPLOYEE);

  const { status, body } = await request("/crm/contacts");

  assert.equal(status, 200);

  const contact = body.data.contacts[0];

  assert.equal(contact.officialEmail, "work@example.test");
  assert.equal(Object.hasOwn(contact, "personalEmail"), false);
  assert.equal(Object.hasOwn(contact, "alternateMobile"), false);
  assert.equal(Object.hasOwn(contact, "emergencyContact"), false);
});

test("Sales employee is denied employee bank data", async () => {
  resetScenario(ROLES.EMPLOYEE, "Sales", "sales");

  const { status } = await request("/crm/accounts");

  assert.equal(status, 403);
  assert.equal(bankFindFilter, undefined);
});

test("Logistics employee is denied employee bank data", async () => {
  resetScenario(ROLES.EMPLOYEE, "Logistics", "logistics");

  const { status } = await request("/crm/accounts");

  assert.equal(status, 403);
  assert.equal(bankFindFilter, undefined);
});

test("Accounts employee can access company-scoped bank data", async () => {
  resetScenario(ROLES.EMPLOYEE, "Accounts", "accounts");

  const { status, body } = await request("/crm/accounts");

  assert.equal(status, 200);
  assert.equal(
    body.data.accounts[0].accountNumber,
    "TEST-ACCOUNT-123"
  );
  assert.equal(identityFindFilter.companyId, COMPANY_A);
  assert.equal(employeeFindFilter.companyId, COMPANY_A);
  assert.equal(bankFindFilter.companyId, COMPANY_A);
});

test("Company Admin retains bank access", async () => {
  resetScenario(ROLES.COMPANY_ADMIN);

  const { status, body } = await request("/crm/accounts");

  assert.equal(status, 200);
  assert.equal(body.data.accounts.length, 1);
});

test("User without company context is denied", async () => {
  resetScenario(ROLES.EMPLOYEE, "Sales", "sales", null);

  const { status } = await request("/crm/contacts");

  assert.equal(status, 403);
  assert.equal(employeeFindFilter, undefined);
});

test("HTTP queries preserve the authenticated company", async () => {
  resetScenario(ROLES.COMPANY_ADMIN, "Sales", "sales", COMPANY_B);

  const { status } = await request("/crm/contacts");

  assert.equal(status, 200);
  assert.equal(employeeFindFilter.companyId, COMPANY_B);
});