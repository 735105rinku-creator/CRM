import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../routes/crm.routes.js", import.meta.url),
  "utf8"
);

// Extract the pure filter function without importing the backend app
// or loading database environment configuration.
const start = source.indexOf("const applySearchFilter =");
const end = source.indexOf("const listRecords =", start);

assert.ok(start !== -1, "Search filter function not found");
assert.ok(end > start, "Search filter boundary not found");

const functionSource = source.slice(start, end);

const searchableFields = {
  leads: ["name", "company", "phone"],
  deals: ["name", "company"],
  tasks: ["title", "description"],
};

const applySearchFilter = new Function(
  "searchableFields",
  `${functionSource}; return applySearchFilter;`
)(searchableFields);

test("Search preserves employee ownership and company isolation", () => {
  const filter = {
    companyId: "company-A",
    $or: [
      { assignedUserId: "employee-A" },
      { createdBy: "employee-A" },
    ],
  };

  const result = applySearchFilter(filter, "leads", "maize");

  assert.ok(Array.isArray(result.$and));

  assert.deepEqual(result.$and[0], filter);

  assert.deepEqual(result.$and[1].$or, [
    { name: { $regex: "maize", $options: "i" } },
    { company: { $regex: "maize", $options: "i" } },
    { phone: { $regex: "maize", $options: "i" } },
  ]);
});

test("Search preserves company-wide admin filter", () => {
  const filter = { companyId: "company-A" };

  const result = applySearchFilter(filter, "deals", "export");

  assert.deepEqual(result.$and[0], filter);
  assert.equal(result.$and[1].$or.length, 2);
});

test("Empty search does not modify visibility restrictions", () => {
  const filter = {
    companyId: "company-A",
    assignedUserId: "employee-A",
  };

  assert.deepEqual(
    applySearchFilter(filter, "leads", "  "),
    filter
  );
});