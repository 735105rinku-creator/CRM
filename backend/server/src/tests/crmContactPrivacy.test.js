import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const routeSource = readFileSync(
  new URL("../routes/crm.routes.js", import.meta.url),
  "utf8"
);

const startMarker = 'router.get("/contacts",';
const endMarker = 'router.get("/accounts",';

const start = routeSource.indexOf(startMarker);
const end = routeSource.indexOf(endMarker, start + 1);

assert.ok(start >= 0 && end > start, "Contacts route must exist");

const contactRoute = routeSource.slice(start, end);

const roles = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  HR: "hr",
  EMPLOYEE: "employee",
};

const employee = {
  _id: "employee-1",
  employeeCode: "EMP001",
  firstName: "Test",
  lastName: "Employee",
  officialEmail: "official@example.test",
  personalEmail: "private@example.test",
  mobile: "9000000001",
  alternateMobile: "9000000002",
  departmentId: { departmentName: "Sales" },
  designationId: { designationName: "Executive" },
  workLocation: "Office",
  emergencyContact: {
    name: "Private Person",
    mobile: "9000000003",
  },
  employeeStatus: "active",
  createdAt: new Date("2026-01-01"),
};

const mapperStart = contactRoute.indexOf(
  "  const canViewPrivateContacts ="
);

const mapperEnd = contactRoute.indexOf(
  "  res.json(",
  mapperStart
);

assert.ok(
  mapperStart >= 0 && mapperEnd > mapperStart,
  "Contact privacy mapper must exist"
);

const mapperSource = contactRoute.slice(
  mapperStart,
  mapperEnd
);

const mapContacts = new Function(
  "req",
  "employees",
  "ROLES",
  "employeeName",
  "departmentName",
  "designationName",
  `${mapperSource}\nreturn contacts;`
);

function getContacts(role) {
  return mapContacts(
    { user: { role } },
    [employee],
    roles,
    (row) => `${row.firstName} ${row.lastName}`,
    (row) => row.departmentId?.departmentName || "",
    (row) => row.designationId?.designationName || ""
  );
}

for (const role of [
  roles.SUPER_ADMIN,
  roles.COMPANY_ADMIN,
  roles.HR,
]) {
  test(`${role} retains full private contact information`, () => {
    const [contact] = getContacts(role);

    assert.equal(contact.personalEmail, employee.personalEmail);
    assert.equal(contact.alternateMobile, employee.alternateMobile);
    assert.deepEqual(
      contact.emergencyContact,
      employee.emergencyContact
    );
  });
}

for (const role of [
  roles.EMPLOYEE,
  "sales",
  "logistics",
  "accounts",
]) {
  test(`${role} cannot read private contact fields`, () => {
    const [contact] = getContacts(role);

    assert.equal(
      Object.hasOwn(contact, "personalEmail"),
      false
    );

    assert.equal(
      Object.hasOwn(contact, "alternateMobile"),
      false
    );

    assert.equal(
      Object.hasOwn(contact, "emergencyContact"),
      false
    );

    assert.equal(contact.officialEmail, employee.officialEmail);
    assert.equal(contact.mobile, employee.mobile);
    assert.equal(contact.employeeCode, employee.employeeCode);
  });
}

test("Contact endpoint retains authentication and tenant guards", () => {
  const routerSetup = routeSource.slice(
    0,
    routeSource.indexOf("const models =")
  );

  assert.match(routerSetup, /router\.use\(requireAuth\)/);
  assert.match(routerSetup, /router\.use\(requireTenant\)/);
});

test("Contacts query remains company scoped", () => {
  assert.match(
    contactRoute,
    /const companyId = companyIdOf\(req\.user\)/
  );

  assert.match(
    contactRoute,
    /withVisibleEmployeeFilter\(\{\s*companyId,\s*isActive:\s*true\s*\}\)/
  );
});