import assert from "node:assert/strict";
import test from "node:test";

import { ROLES } from "../constants/roles.js";
import { getLogisticsPermission } from "../middleware/logisticsPermission.middleware.js";
import LogisticsProductService from "../models/LogisticsProductService.js";
import LogisticsVendor from "../models/LogisticsVendor.js";
import productRepository from "../repositories/logisticsProductService.repository.js";
import vendorRepository from "../repositories/logisticsVendor.repository.js";

const companyA = "64b000000000000000000001";
const companyB = "64b000000000000000000002";

const matches = (row, filter) =>
  String(row.companyId) === String(filter.companyId) &&
  (!filter.vendorType || row.vendorType === filter.vendorType) &&
  row.isActive !== false;

const queryFor = (rows, capture) => (filter) => {
  capture.filter = filter;
  const visible = rows.filter((row) => matches(row, filter));
  return {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => visible,
  };
};

test("CHA list returns active and legacy rows, excludes deleted rows, and preserves tenant isolation", async () => {
  const rows = [
    { _id: "cha-active", companyId: companyA, vendorType: "cha", isActive: true },
    { _id: "cha-legacy", companyId: companyA, vendorType: "cha" },
    { _id: "cha-deleted", companyId: companyA, vendorType: "cha", isActive: false },
    { _id: "cha-other-tenant", companyId: companyB, vendorType: "cha", isActive: true },
  ];
  const capture = {};
  const originalFind = LogisticsVendor.find;
  const originalCount = LogisticsVendor.countDocuments;
  LogisticsVendor.find = queryFor(rows, capture);
  LogisticsVendor.countDocuments = async (filter) => rows.filter((row) => matches(row, filter)).length;
  try {
    const result = await vendorRepository.paginate({ companyId: companyA, vendorType: "cha", limit: 100 });
    assert.deepEqual(result.data.map((row) => row._id), ["cha-active", "cha-legacy"]);
    assert.deepEqual(capture.filter.isActive, { $ne: false });
    assert.equal(capture.filter.companyId, companyA);
  } finally {
    LogisticsVendor.find = originalFind;
    LogisticsVendor.countDocuments = originalCount;
  }
});

test("Products/Services keeps legacy rows visible without leaking another tenant", async () => {
  const rows = [
    { _id: "product-active", companyId: companyA, isActive: true },
    { _id: "product-legacy", companyId: companyA },
    { _id: "product-deleted", companyId: companyA, isActive: false },
    { _id: "product-other-tenant", companyId: companyB, isActive: true },
  ];
  const capture = {};
  const originalFind = LogisticsProductService.find;
  const originalCount = LogisticsProductService.countDocuments;
  LogisticsProductService.find = queryFor(rows, capture);
  LogisticsProductService.countDocuments = async (filter) => rows.filter((row) => matches(row, filter)).length;
  try {
    const result = await productRepository.paginate({ companyId: companyA, limit: 100 });
    assert.deepEqual(result.data.map((row) => row._id), ["product-active", "product-legacy"]);
    assert.deepEqual(capture.filter.isActive, { $ne: false });
    assert.equal(capture.filter.companyId, companyA);
  } finally {
    LogisticsProductService.find = originalFind;
    LogisticsProductService.countDocuments = originalCount;
  }
});

test("a Logistics Employee has valid CHA and Products/Services read permission", () => {
  const req = { user: { role: ROLES.EMPLOYEE }, logisticsAccess: { accessType: "employee" } };
  assert.equal(getLogisticsPermission(req, "cha")?.view, true);
  assert.equal(getLogisticsPermission(req, "productsServices")?.view, true);
});
