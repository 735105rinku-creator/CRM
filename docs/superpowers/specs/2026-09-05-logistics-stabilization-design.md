# Logistics Stabilization Design

## Scope

Stabilize the existing Logistics implementation without changing its architecture, MongoDB data, indexes, migrations, seeds, Driver module, or unrelated CRM modules. The current uncommitted Logistics work is the baseline and must be preserved unless a specific audited defect requires a targeted correction.

## Design

- Keep Angular components on the existing `ApiService` and preserve the Express route → middleware → controller → service → repository → model flow.
- Resolve shipment authorization from the requested shipment mode for create and from the tenant-scoped stored shipment for update/delete. Retain own/team/all scope and never grant delete/export implicitly.
- Apply action-level Logistics permissions to CHA clearance, Transporters, Warehouse, and Import/Export routes.
- Orchestrate Air Cargo edit loading once, remove focus reloads and fake lookup identifiers, and render the form only after the edit record is ready.
- Replace the Air Cargo native `<details>` menu with row-ID state and connect every advertised action.
- Make one backend charge calculator authoritative for Air and Sea Freight, storing explicit discount/tax fields inside the existing `charges` subdocument without a migration.
- Treat only `isActive: false` as deleted in appropriate Logistics repository reads.
- Add confirmation-backed delete/edit UI only where matching backend support exists.

## Verification

Every behavioral change begins with a failing regression test. Final verification includes Logistics tests, backend syntax checks, Angular production build, route/action contract checks, fake-ID search, PATCH edit checks, and soft-delete compatibility checks.

