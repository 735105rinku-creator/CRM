import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../routes/crm.routes.js", import.meta.url),
  "utf8"
);

const start = source.indexOf(
  "const requireEmployeeBankAccess ="
);

const end = source.indexOf(
  "const scopeFilter =",
  start
);

assert.ok(start >= 0, "Privacy middleware not found");
assert.ok(end > start, "Middleware boundary not found");

const code = source.slice(start, end);

const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  HR: "hr",
  EMPLOYEE: "employee",
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

let departmentName = "Sales";
let departmentCode = "";
let departmentFeatureKey = "none";
let lookupCount = 0;
let lastEmployeeFilter = null;
let employeeExists = true;

const Employee = {
  findOne(filter) {
    lookupCount++;
    lastEmployeeFilter = filter;

    return {
      async populate() {
        return employeeExists
          ? {
              departmentId: {
                departmentName,
                departmentCode,
                featureKey: departmentFeatureKey,
              },
            }
          : null;
      },
    };
  },
};

const asyncHandler = (handler) => handler;

const companyIdOf = (user, auth = {}) =>
  auth.companyId ||
  user?.companyId?._id ||
  user?.companyId;

const getEmployeeCode = (user) =>
  String(user?.employeeCode || "")
    .trim()
    .toUpperCase();

const middleware = new Function(
  "asyncHandler",
  "ApiError",
  "Employee",
  "ROLES",
  "companyIdOf",
  "getEmployeeCode",
  `${code}; return requireEmployeeBankAccess;`
)(
  asyncHandler,
  ApiError,
  Employee,
  ROLES,
  companyIdOf,
  getEmployeeCode
);

async function checkAccess(role, options = {}) {
  departmentName = options.department ?? "Sales";
  departmentCode = options.departmentCode ?? "";
  departmentFeatureKey = options.featureKey ?? "none";
  employeeExists = options.employeeExists ?? true;
  lookupCount = 0;
  lastEmployeeFilter = null;

  let nextCalled = false;

  const req = {
    user: {
      _id: "user-1",
      role,
      companyId: options.companyId === undefined
        ? "company-1"
        : options.companyId,
      employeeCode: "EMP001",
    },
    auth: {
      companyId: options.companyId === undefined
        ? "company-1"
        : options.companyId,
    },
  };

  let error = null;

  try {
    await middleware(req, {}, () => {
      nextCalled = true;
    });
  } catch (err) {
    error = err;
  }

  return { nextCalled, error, lookupCount };
}

test("Company Admin can access employee bank data", async () => {
  const result = await checkAccess(ROLES.COMPANY_ADMIN);

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, null);
});

test("HR can access employee bank data", async () => {
  const result = await checkAccess(ROLES.HR);

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, null);
});

test("Accounts employee is allowed", async () => {
  const result = await checkAccess(
    ROLES.EMPLOYEE,
    { department: "Accounts" }
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, null);
});

test("Finance employee is allowed", async () => {
  const result = await checkAccess(
    ROLES.EMPLOYEE,
    { department: "Finance" }
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, null);
});

test("Sales employee is denied", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE);

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Logistics employee is denied", async () => {
  const result = await checkAccess(
    ROLES.EMPLOYEE,
    { department: "Logistics" }
  );

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Employee without matching record is denied", async () => {
  const result = await checkAccess(
    ROLES.EMPLOYEE,
    { employeeExists: false }
  );

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Missing company context is denied", async () => {
  const result = await checkAccess(
    ROLES.COMPANY_ADMIN,
    { companyId: null }
  );

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Bank accounts route uses privacy middleware", () => {
  assert.match(
    source,
    /router\.get\(\s*["']\/accounts["']\s*,\s*requireEmployeeBankAccess/
  );
});

test("Accounts featureKey allows access", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Operations",
    featureKey: "accounts",
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, null);
});

test("Sales featureKey denies misleading Accounts name", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Accounts",
    featureKey: "sales",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Logistics featureKey denies misleading Finance name", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Finance",
    featureKey: "logistics",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Legacy Accounts department remains allowed", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Accounts",
    featureKey: "none",
  });

  assert.equal(result.nextCalled, true);
});

test("Non-Accounts department is denied", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Non-Accounts",
    featureKey: "none",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Finance Team does not get automatic bank access", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Finance Team",
    featureKey: "none",
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.error?.statusCode, 403);
});

test("Legacy FIN department code allows access", async () => {
  const result = await checkAccess(ROLES.EMPLOYEE, {
    department: "Operations",
    departmentCode: "FIN",
    featureKey: "none",
  });

  assert.equal(result.nextCalled, true);
});

test("Employee lookup stays company-scoped", async () => {
  await checkAccess(ROLES.EMPLOYEE, {
    department: "Accounts",
    featureKey: "accounts",
  });

  assert.equal(lastEmployeeFilter.companyId, "company-1");
});

test("Employee userId is the primary identity", async () => {
  await checkAccess(ROLES.EMPLOYEE, {
    department: "Accounts",
    featureKey: "accounts",
  });

  assert.deepEqual(
    lastEmployeeFilter.$or[0],
    { userId: "user-1" }
  );
});

test("Employee code fallback requires unlinked userId", async () => {
  await checkAccess(ROLES.EMPLOYEE, {
    department: "Accounts",
    featureKey: "accounts",
  });

  assert.deepEqual(
    lastEmployeeFilter.$or[1],
    {
      employeeCode: "EMP001",
      $or: [
        { userId: null },
        { userId: { $exists: false } },
      ],
    }
  );
});
