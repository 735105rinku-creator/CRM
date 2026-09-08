# Logistics Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and stabilize the current Logistics implementation while preserving tenant isolation, scoped RBAC, existing behavior, and the uncommitted baseline.

**Architecture:** Targeted changes retain the existing Angular and Express layering. Authorization, totals, legacy active-record handling, and UI actions are fixed at their existing ownership boundaries.

**Tech Stack:** Angular 21, TypeScript 5.9, RxJS 7.8, Node.js, Express 5, MongoDB/Mongoose, Joi, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-05-logistics-stabilization-design.md`

## Global Constraints

- No MongoDB data, migration, seed, reset, or index changes.
- No Driver module or unrelated feature changes.
- Preserve the current dirty working tree and all 12 passing Logistics checks.
- Every new behavior requires a failing test before implementation.

---

### Task 1: Permission and route contracts

**Files:**
- Modify: `backend/server/src/routes/logistics.routes.js`
- Modify: `backend/server/src/routes/logisticsCha.routes.js`
- Modify: `backend/server/src/routes/logisticsTransporter.routes.js`
- Modify: `backend/server/src/routes/logisticsWarehouse.routes.js`
- Modify: `backend/server/src/routes/logisticsImportExport.routes.js`
- Modify: `backend/server/src/middleware/logisticsPermission.middleware.js`
- Modify: `frontend/crm-frontend/src/app/features/logistics/cha/cha.component.ts`
- Test: `backend/server/src/tests/logisticsRoutePermissionContracts.test.js`
- Test: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

- [ ] Add failing tests for mode-aware shipment authorization and missing child-route permissions.
- [ ] Verify the tests fail for the audited reasons.
- [ ] Implement tenant-scoped, mode-aware permission selection and action middleware.
- [ ] Point CHA clearance lookups at `/logistics/cha/masters`.
- [ ] Run the focused tests until green.

### Task 2: Air Cargo edit orchestration and action menu

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-new/air-cargo-new.component.html`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.html`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.scss`
- Test: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

- [ ] Add failing tests for no focus reload, deterministic edit readiness, PATCH-only edit, row-ID menu state, and connected actions.
- [ ] Verify the tests fail.
- [ ] Implement a single edit/load orchestration and meaningful lookup errors.
- [ ] Replace `<details>` with controlled menu state and connect AWB, invoice, status, and delete actions.
- [ ] Run focused tests and Angular compilation.

### Task 3: Authoritative charge calculation

**Files:**
- Modify: `backend/server/src/models/LogisticsShipment.js`
- Modify: `backend/server/src/services/logisticsShipment.service.js`
- Modify: `backend/server/src/validators/logisticsShipment.validator.js`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/sea-freight/sea-freight.component.ts`
- Test: `backend/server/src/tests/logisticsChargeCalculation.test.js`
- Test: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

- [ ] Add failing table-driven tests with hand-calculated subtotal, discount, taxable amount, GST, other tax, and total.
- [ ] Verify failure against the current simple-sum calculator.
- [ ] Add one shared backend calculator and schema/validator fields.
- [ ] Send explicit charge inputs from Air/Sea and correct Sea edit mapping.
- [ ] Run focused tests until green.

### Task 4: Real-ID dropdowns and lookup errors

**Files:**
- Modify: Air Cargo, Sea Freight, CHA, invoice-new, and vendor-payment component TypeScript files under `frontend/crm-frontend/src/app/features/logistics/`
- Test: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

- [ ] Add failing tests rejecting fake/fallback IDs and silent errors.
- [ ] Remove placeholder records and require `_id` for backend-linked options while preserving `Other`.
- [ ] Align each lookup with its existing endpoint and display name.
- [ ] Run focused tests until green.

### Task 5: Legacy soft-delete compatibility

**Files:**
- Modify: applicable `backend/server/src/repositories/logistics*.repository.js`
- Modify: directly queried Logistics services where applicable
- Test: `backend/server/src/tests/logisticsSoftDeleteCompatibility.test.js`

- [ ] Add failing query-contract tests proving missing `isActive` remains visible and `false` is excluded.
- [ ] Replace appropriate active-read filters with `{ isActive: { $ne: false } }` without changing delete writes.
- [ ] Run focused tests until green.

### Task 6: Missing supported UI actions

**Files:**
- Modify: Documents, Customers, Vendors, Products & Services, Transporters, and Warehouse Master component TS/HTML files under `frontend/crm-frontend/src/app/features/logistics/`
- Modify: component SCSS only where existing action layout needs alignment
- Test: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

- [ ] Add failing tests for confirmation-backed calls to existing DELETE/PATCH routes.
- [ ] Implement supported edit/delete actions with visible failures.
- [ ] Run focused tests until green.

### Task 7: Full verification

- [ ] Run all Logistics Node tests.
- [ ] Run backend syntax checks for every changed JavaScript file.
- [ ] Run Angular production build.
- [ ] Run route/action contract, fake-ID, PATCH, and soft-delete searches/tests.
- [ ] Review the final diff to confirm no Driver, database, migration, seed, or unrelated files changed.
