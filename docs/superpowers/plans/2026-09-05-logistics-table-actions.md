# Logistics Table Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize every applicable Logistics list table on a reusable `[View] [Edit] [More]` action control without changing backend behavior, record targeting, permissions, or tenant isolation.

**Architecture:** A standalone shared Angular component renders the three icon controls and a CDK connected overlay. A root-scoped menu coordinator keeps one row-ID-controlled menu open at a time. Feature components retain all business handlers and resolve emitted IDs back to their existing records before dispatching actions.

**Tech Stack:** Angular 21 standalone components, Angular CDK Overlay, signals, existing Node source-contract tests.

**Spec:** `docs/superpowers/specs/2026-09-05-logistics-table-actions-design.md`

## Global Constraints

- Preserve all existing uncommitted Logistics work as the baseline.
- Do not reset, revert, overwrite, or broadly reformat existing Logistics files.
- Do not touch MongoDB, migrations, seeds, resets, indexes, Driver, or unrelated modules.
- Keep existing backend routes, HTTP methods, tenant isolation, and permission enforcement.
- Add tests before each production migration and observe the expected failure.
- Do not expose unsupported actions or use display/index IDs for backend operations.
- Do not commit implementation files from the dirty baseline unless the user explicitly requests it.

---

### Task 1: Shared action component and menu coordinator

**Files:**
- Create: `frontend/crm-frontend/src/app/features/logistics/shared/table-actions/logistics-table-actions.component.ts`
- Create: `frontend/crm-frontend/src/app/features/logistics/shared/table-actions/logistics-table-actions.component.html`
- Create: `frontend/crm-frontend/src/app/features/logistics/shared/table-actions/logistics-table-actions.component.scss`
- Create: `frontend/crm-frontend/src/app/features/logistics/shared/table-actions/logistics-table-actions-menu.service.ts`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Produces `LogisticsSecondaryAction { key: string; label: string; danger?: boolean; disabled?: boolean }`.
- Produces outputs `view = output<string>()`, `edit = output<string>()`, and `secondaryAction = output<{ rowId: string; actionKey: string }>()`.
- Produces coordinator methods `open(rowId: string)`, `close()`, `toggle(rowId: string)`, and `isOpen(rowId: string)`.

- [ ] **Step 1: Write the failing shared-component contract test**

Add assertions that the component files exist, import CDK overlay primitives, render eye/pencil/vertical-ellipsis buttons with `title` and `aria-label`, bind a connected overlay, emit row IDs, contain no `details`, and define 36px focus/hover/disabled/danger styles.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="shared Logistics table actions" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL because the shared files do not exist.

- [ ] **Step 3: Implement the coordinator and standalone component**

Use this public shape:

```ts
export interface LogisticsSecondaryAction {
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

rowId = input.required<string>();
showView = input(true);
showEdit = input(true);
viewDisabled = input(false);
editDisabled = input(false);
secondaryActions = input<readonly LogisticsSecondaryAction[]>([]);
view = output<string>();
edit = output<string>();
secondaryAction = output<{ rowId: string; actionKey: string }>();
```

Use `CdkOverlayOrigin`, `CdkConnectedOverlay`, `cdkConnectedOverlayOpen`, `cdkConnectedOverlayBackdropClick`, `cdkConnectedOverlayDetach`, and a reposition scroll strategy. Close before emitting any action.

- [ ] **Step 4: Run the focused test and Angular build**

Run: `node --test --test-name-pattern="shared Logistics table actions" src/tests/logisticsUiContracts.test.mjs`

Run: `npm.cmd run build`

Expected: PASS; build succeeds with only previously documented unrelated warnings.

- [ ] **Step 5: Review the isolated diff**

Run: `git diff -- frontend/crm-frontend/src/app/features/logistics/shared frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

Confirm no feature handler or API route changed.

---

### Task 2: Shipment tables

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.html`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/air-cargo/air-cargo-list/air-cargo-list.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/sea-freight/sea-freight.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/sea-freight/sea-freight.component.html`
- Modify: `frontend/crm-frontend/src/app/features/logistics/shipments/sea-freight/sea-freight.component.scss`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Consumes `LogisticsTableActionsComponent`.
- Feature dispatchers accept `{ rowId, actionKey }`, locate by MongoDB ID, then call existing handlers.

- [ ] **Step 1: Add failing shipment action tests**

Assert both tables import/render `app-logistics-table-actions`, pass the MongoDB ID, and map secondary keys to existing handlers. Assert Air Cargo no longer contains its local menu implementation or absolute/fixed dropdown CSS.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --test-name-pattern="shipment tables use shared actions" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL because both templates still own their controls.

- [ ] **Step 3: Migrate Air Cargo**

Keep `viewShipment`, `editShipment`, `duplicateShipment`, `showAwb`, `createInvoice`, `updateStatus`, `uploadDeliveryReceipt`, and `deleteShipment`. Add ID-based dispatchers and secondary action definitions; remove local menu signals/listeners/styles. Preserve the delivery receipt file action outside the menu only if CDK menu activation cannot securely trigger the file input.

- [ ] **Step 4: Migrate Sea Freight**

Connect existing View and Edit handlers as primary outputs. Put only supported status, invoice, print/download, and delete handlers in secondary actions. Disable actions when the row lacks `_id`.

- [ ] **Step 5: Verify shipment tests and build**

Run: `node --test src/tests/logisticsUiContracts.test.mjs src/tests/urgentLogisticsRequirements.test.mjs`

Run: `npm.cmd run build`

Expected: all tests and build pass.

---

### Task 3: Master-data tables

**Files:**
- Modify the `.ts`, `.html`, and only where necessary `.scss` files for:
  - `frontend/crm-frontend/src/app/features/logistics/cha-master/cha-master.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/cha/cha.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/transporters/transporter.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/warehouse-master/warehouse-master.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/customers/logistics-customers.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/vendors/logistics-vendors.component.*`
  - `frontend/crm-frontend/src/app/features/logistics/products-services/products-services.component.*`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Each feature provides ID lookup functions such as `customerById(id)`, or a generic local dispatcher that searches its existing signal by `_id`/`raw._id`.
- Delete remains in the More list and calls the already-confirmed existing delete handler.

- [ ] **Step 1: Add failing per-module rendering and targeting contracts**

Assert all seven master-data templates render the shared component, do not render row-level delete icons, and pass `_id` or `raw._id`. Assert CHA status toggles and Warehouse activate/deactivate appear as secondary action keys.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --test-name-pattern="master data tables use shared actions" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL on existing direct buttons.

- [ ] **Step 3: Migrate CHA Master and Clearance**

Primary actions call existing view/edit handlers. Secondary actions dispatch status and permitted delete. Continue using `/logistics/cha/masters` and existing clearance endpoints.

- [ ] **Step 4: Migrate Transporters and Warehouse Master**

Primary actions call existing view/edit handlers. Secondary actions dispatch activate/deactivate and permitted delete. Do not alter API endpoints.

- [ ] **Step 5: Migrate Customers, Vendors, and Products & Services**

Primary actions call existing view/edit handlers. Delete moves to More with existing confirmation. Preserve real MongoDB ID extraction through `raw._id || _id`.

- [ ] **Step 6: Verify tests and build**

Run: `node --test src/tests/logisticsUiContracts.test.mjs`

Run: `npm.cmd run build`

Expected: all tests and build pass.

---

### Task 4: Operational tables

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/logistics/documents/logistics-documents.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/documents/logistics-documents.component.html`
- Modify where necessary: `frontend/crm-frontend/src/app/features/logistics/documents/logistics-documents.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/logistics/warehouse/warehouse.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/warehouse/warehouse.component.html`
- Modify where necessary: `frontend/crm-frontend/src/app/features/logistics/warehouse/warehouse.component.scss`
- Inspect and modify only applicable row actions in `frontend/crm-frontend/src/app/features/logistics/tracking/tracking.component.*`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Documents: View maps to preview, Edit maps to metadata edit, More contains Download and permitted Delete.
- Warehouse receipts: View/Edit appear only if meaningful handlers exist; all status transitions are secondary actions keyed by backend status.
- Tracking timeline form controls are excluded; only genuine record rows use the shared component.

- [ ] **Step 1: Add failing operational-table tests**

Assert Documents dispatches preview/edit/download/delete by `mongoId`. Assert Warehouse status keys still call `updateReceiptStatus` with the selected receipt ID. Assert Tracking is migrated only if a genuine row action table exists.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --test-name-pattern="operational tables use shared actions" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL on Documents and Warehouse direct controls.

- [ ] **Step 3: Implement minimal migrations**

Replace row controls without changing upload, preview, download, edit, delete, or receipt status API calls. Omit unsupported View/Edit rather than adding placeholder behavior.

- [ ] **Step 4: Verify tests and build**

Run: `node --test src/tests/logisticsUiContracts.test.mjs`

Run: `npm.cmd run build`

Expected: all tests and build pass.

---

### Task 5: Financial tables

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/logistics/vendor-payments/vendor-payment.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/vendor-payments/vendor-payment.component.html`
- Modify where necessary: `frontend/crm-frontend/src/app/features/logistics/vendor-payments/vendor-payment.component.scss`
- Modify: `frontend/crm-frontend/src/app/features/logistics/invoices/invoice-list/logistics-invoice-list.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/logistics/invoices/invoice-list/logistics-invoice-list.component.html`
- Modify where necessary: `frontend/crm-frontend/src/app/features/logistics/invoices/invoice-list/logistics-invoice-list.component.scss`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Invoice More actions preserve print/download/status/delete only where corresponding handlers exist.
- Vendor Payment More actions preserve its existing update/view/payment behavior and backend IDs.

- [ ] **Step 1: Add failing financial-table contracts**

Assert both tables render the shared component, pass backend IDs, and route primary/secondary actions to existing handlers. Assert row-level text View/Update buttons and standalone delete icons are absent.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test --test-name-pattern="financial tables use shared actions" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL on the current controls.

- [ ] **Step 3: Migrate Vendor Payments and Invoices**

Add ID-based dispatchers and replace direct row controls. Preserve every existing API method, confirmation, and error path.

- [ ] **Step 4: Verify tests and build**

Run: `node --test src/tests/logisticsUiContracts.test.mjs src/tests/urgentLogisticsRequirements.test.mjs`

Run: `npm.cmd run build`

Expected: all tests and build pass.

---

### Task 6: Reports applicability audit and global cleanup

**Files:**
- Inspect and modify only if a genuine row-action table exists: `frontend/crm-frontend/src/app/features/logistics/reports/logistics-reports.component.*`
- Modify: `frontend/crm-frontend/src/tests/logisticsUiContracts.test.mjs`

**Interfaces:**
- Page-level Generate, Export, Print, and filter controls are not table actions and remain unchanged.

- [ ] **Step 1: Add a failing global consistency scan**

Scan applicable Logistics table templates for native `details`, direct row-level delete buttons, generic plus icons used as View/Edit, and text-only View/Update row buttons. Assert shared action usage in every table identified in Tasks 2–5.

- [ ] **Step 2: Run the scan and verify RED**

Run: `node --test --test-name-pattern="all applicable Logistics tables share one action pattern" src/tests/logisticsUiContracts.test.mjs`

Expected: FAIL listing any remaining inconsistent table.

- [ ] **Step 3: Remove remaining duplicated action CSS and migrate applicable report rows**

Delete only obsolete local action-button/menu rules. Keep general form buttons and report toolbar controls intact.

- [ ] **Step 4: Run the scan and verify GREEN**

Run: `node --test src/tests/logisticsUiContracts.test.mjs`

Expected: PASS.

---

### Task 7: Final verification

**Files:**
- Verify all modified frontend files and existing Logistics backend contracts; no new production edits unless a failing regression proves the need.

- [ ] **Step 1: Run all Logistics frontend regressions**

Run: `node --test src/tests/logisticsUiContracts.test.mjs src/tests/urgentLogisticsRequirements.test.mjs`

Working directory: `frontend/crm-frontend`

- [ ] **Step 2: Run all Logistics backend regressions**

Run: `node --test src/tests/logisticsChaMasterPermission.test.js src/tests/logisticsChargeCalculation.test.js src/tests/logisticsMasterVisibility.test.js src/tests/logisticsRoutePermissionContracts.test.js src/tests/logisticsSoftDeleteCompatibility.test.js src/tests/urgentLogisticsRequirements.test.js`

Working directory: `backend/server`

- [ ] **Step 3: Run action and fake-handler scans**

Run searches for native `details`, row-level text View/Update, generic plus icons in action cells, silent `error: () => undefined`, fake IDs, and direct action-menu CSS outside the shared component.

- [ ] **Step 4: Run Angular production build**

Run: `npm.cmd run build`

Working directory: `frontend/crm-frontend`

- [ ] **Step 5: Inspect the final diff**

Run: `git diff --check` and `git status --short`.

Confirm Driver, database scripts, migrations, seeds, resets, indexes, and unrelated modules are untouched.
