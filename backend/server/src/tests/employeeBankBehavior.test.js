import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { Employee } from "../models/Employee.js";
import { EmployeeBank } from "../models/EmployeeBank.js";
import { getEmployeeBankService } from "../services/employee.service.js";
import { ROLES } from "../constants/roles.js";

const COMPANY_A = "111111111111111111111111";
const COMPANY_B = "222222222222222222222222";

const USER_A = "333333333333333333333333";
const USER_B = "444444444444444444444444";

const EMPLOYEE_A = "555555555555555555555555";
const EMPLOYEE_B = "666666666666666666666666";

const bank = {
  employeeId: EMPLOYEE_A,
  bankName: "Test Bank",
  accountNumber: "TEST_ACCOUNT_ONLY"
};

function makeUser(role, overrides = {}) {
  return {
    _id: USER_A,
    role,
    companyId: COMPANY_A,
    employee: EMPLOYEE_A,
    permissions: [],
    ...overrides
  };
}

function makeEmployee(overrides = {}) {
  return {
    _id: EMPLOYEE_A,
    companyId: COMPANY_A,
    userId: USER_A,
    ...overrides
  };
}

async function runScenario({
  user,
  employee,
  expectedStatus,
  expectedBankRead
}) {
  let bankReadCount = 0;

  const employeeMock = mock.method(
    Employee,
    "findById",
    async () => employee
  );

  const bankMock = mock.method(
    EmployeeBank,
    "findOne",
    async () => {
      bankReadCount += 1;
      return bank;
    }
  );

  try {
    if (expectedStatus) {
      await assert.rejects(
        () => getEmployeeBankService(user, employee._id),
        (error) => {
          assert.equal(
            error.statusCode ?? error.status,
            expectedStatus
          );
          return true;
        }
      );
    } else {
      const result = await getEmployeeBankService(
        user,
        employee._id
      );

      assert.equal(result, bank);
    }

    assert.equal(bankReadCount, expectedBankRead);
  } finally {
    bankMock.mock.restore();
    employeeMock.mock.restore();
  }
}

test("Support cannot read another employee bank", async () => {
  await runScenario({
    user: makeUser(ROLES.SUPPORT),
    employee: makeEmployee({
      _id: EMPLOYEE_B,
      userId: USER_B
    }),
    expectedStatus: 403,
    expectedBankRead: 0
  });
});

test("Support can read own linked employee bank", async () => {
  await runScenario({
    user: makeUser(ROLES.SUPPORT),
    employee: makeEmployee(),
    expectedBankRead: 1
  });
});

test("Employee can read own linked bank", async () => {
  await runScenario({
    user: makeUser(ROLES.EMPLOYEE),
    employee: makeEmployee(),
    expectedBankRead: 1
  });
});

test("Employee cannot read another employee bank", async () => {
  await runScenario({
    user: makeUser(ROLES.EMPLOYEE),
    employee: makeEmployee({
      _id: EMPLOYEE_B,
      userId: USER_B
    }),
    expectedStatus: 403,
    expectedBankRead: 0
  });
});

test("HR can read same-company employee bank", async () => {
  await runScenario({
    user: makeUser(ROLES.HR),
    employee: makeEmployee({
      _id: EMPLOYEE_B,
      userId: USER_B
    }),
    expectedBankRead: 1
  });
});

test("Company Admin can read employee bank", async () => {
  await runScenario({
    user: makeUser(ROLES.COMPANY_ADMIN),
    employee: makeEmployee({
      _id: EMPLOYEE_B,
      userId: USER_B
    }),
    expectedBankRead: 1
  });
});

test("Cross-company employee bank read is denied", async () => {
  await runScenario({
    user: makeUser(ROLES.EMPLOYEE),
    employee: makeEmployee({
      companyId: COMPANY_B
    }),
    expectedStatus: 403,
    expectedBankRead: 0
  });
});

test("Contradictory identity links are denied", async () => {
  await runScenario({
    user: makeUser(ROLES.EMPLOYEE),
    employee: makeEmployee({
      userId: USER_B
    }),
    expectedStatus: 403,
    expectedBankRead: 0
  });
});

test("Unlinked employee bank access is denied", async () => {
  await runScenario({
    user: makeUser(ROLES.EMPLOYEE, {
      employee: null
    }),
    employee: makeEmployee({
      userId: null
    }),
    expectedStatus: 403,
    expectedBankRead: 0
  });
});