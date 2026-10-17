import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import jwt from "jsonwebtoken";

import app from "../app.js";
import { User } from "../models/User.js";
import { Employee } from "../models/Employee.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { ROLES, USER_STATUS } from "../constants/roles.js";

const COMPANY = "111111111111111111111111";
const USER = "222222222222222222222222";
const OTHER_USER = "333333333333333333333333";
const EMPLOYEE = "444444444444444444444444";
const OTHER_EMPLOYEE = "555555555555555555555555";

let server;
let baseUrl;
let currentUser;
let currentEmployee;

function user(role, overrides = {}) {
  return {
    _id: USER,
    role,
    status: USER_STATUS.ACTIVE,
    companyId: { _id: COMPANY },
    employee: EMPLOYEE,
    permissions: [],
    roleRef: null,
    ...overrides,
  };
}

function employee(overrides = {}) {
  return {
    _id: EMPLOYEE,
    companyId: COMPANY,
    userId: USER,
    ...overrides,
  };
}

function token() {
  return jwt.sign(
    { sub: USER, role: currentUser.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "10m" }
  );
}

async function request(employeeId) {
  const response = await fetch(
    `${baseUrl}/hr/employees/${employeeId}/bank`,
    {
      headers: { Authorization: `Bearer ${token()}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

before(async () => {
  assert.equal(process.env.NODE_ENV, "test");
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

  mock.method(Employee, "findById", async () => currentEmployee);

  mock.method(EmployeeBank, "findOne", async () => ({
    employeeId: currentEmployee._id,
    bankName: "Mock Bank",
    accountNumber: "FAKE-ONLY",
  }));

  server = app.listen(0, "127.0.0.1");

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  mock.restoreAll();

  if (server) {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("Support cannot read another employee bank", async () => {
  currentUser = user(ROLES.SUPPORT);
  currentEmployee = employee({
    _id: OTHER_EMPLOYEE,
    userId: OTHER_USER,
  });

  const result = await request(OTHER_EMPLOYEE);
  assert.equal(result.status, 403);
});

test("HR can read same-company bank", async () => {
  currentUser = user(ROLES.HR);
  currentEmployee = employee({
    _id: OTHER_EMPLOYEE,
    userId: OTHER_USER,
  });

  const result = await request(OTHER_EMPLOYEE);
  assert.equal(result.status, 200);
});

test("Company Admin can read employee bank", async () => {
  currentUser = user(ROLES.COMPANY_ADMIN);
  currentEmployee = employee({
    _id: OTHER_EMPLOYEE,
    userId: OTHER_USER,
  });

  const result = await request(OTHER_EMPLOYEE);
  assert.equal(result.status, 200);
});

test("Employee cannot read another employee bank via HTTP", async () => {
  currentUser = user(ROLES.EMPLOYEE);
  currentEmployee = employee({
    _id: OTHER_EMPLOYEE,
    userId: OTHER_USER,
  });

  const result = await request(OTHER_EMPLOYEE);
  assert.equal(result.status, 403);
});

test("Cross-company bank request is denied via HTTP", async () => {
  currentUser = user(ROLES.EMPLOYEE);
  currentEmployee = employee({
    companyId: "666666666666666666666666",
  });

  const result = await request(EMPLOYEE);
  assert.equal(result.status, 403);
});

test("Contradictory employee identity is denied via HTTP", async () => {
  currentUser = user(ROLES.EMPLOYEE);
  currentEmployee = employee({
    userId: OTHER_USER,
  });

  const result = await request(EMPLOYEE);
  assert.equal(result.status, 403);
});

test("Unlinked employee bank access is denied via HTTP", async () => {
  currentUser = user(ROLES.EMPLOYEE, {
    employee: null,
  });
  currentEmployee = employee({
    userId: null,
  });

  const result = await request(EMPLOYEE);
  assert.equal(result.status, 403);
});

test("Super Admin bank access remains available", async () => {
  currentUser = user(ROLES.SUPER_ADMIN);
  currentEmployee = employee({
    _id: OTHER_EMPLOYEE,
    userId: OTHER_USER,
  });

  const result = await request(OTHER_EMPLOYEE);
  assert.equal(result.status, 200);
});
test("Employee with User.employee link can read own bank", async () => {
  currentUser = user(ROLES.EMPLOYEE);
  currentEmployee = employee();

  const result = await request(EMPLOYEE);
  assert.equal(result.status, 200);
});

test("Legacy Employee.userId-only self access is allowed", async () => {
  currentUser = user(ROLES.EMPLOYEE, {
    employee: null,
  });
  currentEmployee = employee();

  const result = await request(EMPLOYEE);

  assert.equal(
    result.status,
    200,
    "Valid Employee.userId-only self access must be allowed"
  );

  console.log(
    `Legacy employee self-access HTTP status: ${result.status}`
  );
});