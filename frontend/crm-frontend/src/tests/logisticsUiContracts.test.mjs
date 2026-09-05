import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../app/features/logistics/${path}`, import.meta.url), "utf8");

test("shared Logistics table actions provide accessible row-targeted overlay controls", async () => {
  const [ts, html, scss, coordinator] = await Promise.all([
    read("shared/table-actions/logistics-table-actions.component.ts"),
    read("shared/table-actions/logistics-table-actions.component.html"),
    read("shared/table-actions/logistics-table-actions.component.scss"),
    read("shared/table-actions/logistics-table-actions-menu.service.ts"),
  ]);
  assert.match(ts, /CdkConnectedOverlay/);
  assert.match(ts, /rowId\s*=\s*input\.required<string>/);
  assert.match(ts, /secondaryAction\s*=\s*output/);
  assert.match(html, /title="View"/);
  assert.match(html, /title="Edit"/);
  assert.match(html, /title="More actions"/);
  assert.match(html, /cdkConnectedOverlay/);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.match(scss, /width:\s*36px/);
  assert.match(scss, /height:\s*36px/);
  assert.match(scss, /:focus-visible/);
  assert.match(scss, /:disabled/);
  assert.match(scss, /z-index:\s*1200/);
  assert.match(coordinator, /openRowId/);
  assert.match(coordinator, /toggle\(rowId: string\)/);
});

test("Air Cargo list uses the shared unclipped row menu and connects every advertised action", async () => {
  const [ts, html] = await Promise.all([
    read("shipments/air-cargo/air-cargo-list/air-cargo-list.component.ts"),
    read("shipments/air-cargo/air-cargo-list/air-cargo-list.component.html"),
  ]);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.match(html, /<app-logistics-table-actions/);
  assert.match(ts, /actionKey === 'awb'\) this\.showAwb\(shipment\)/);
  assert.match(ts, /actionKey === 'invoice'\) this\.createInvoice\(shipment\)/);
  assert.match(ts, /actionKey === 'status'\) this\.updateStatus\(shipment\)/);
  assert.doesNotMatch(ts, /freightAmount:\s*this\.number\(\s*raw\.charges\s*\?\.totalAmount/);
});

test("Air Cargo edit has a loading gate and no focus-triggered lookup reload", async () => {
  const [ts, html] = await Promise.all([
    read("shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts"),
    read("shipments/air-cargo/air-cargo-new/air-cargo-new.component.html"),
  ]);
  assert.doesNotMatch(ts, /HostListener\('window:focus'\)/);
  assert.match(html, /isLoadingEdit\(\)/);
  assert.match(html, /Edit Air Cargo Shipment/);
  assert.match(ts, /api\.patch<LogisticsShipmentResponse>/);
});

test("backend-linked customer options never use fake or slug fallback IDs", async () => {
  const sources = await Promise.all([
    read("shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts"),
    read("shipments/sea-freight/sea-freight.component.ts"),
  ]);
  for (const source of sources) {
    assert.doesNotMatch(source, /global-traders|sunrise-enterprises|abc-corporation|xyz-pvt-ltd/);
    assert.doesNotMatch(source, /return customer\._id \|\| customer\.customerCode/);
  }
});

test("supported Logistics master lists expose confirmed soft-delete actions", async () => {
  const modules = [
    ["customers/logistics-customers", "deleteCustomer", "/logistics/customers/"],
    ["vendors/logistics-vendors", "deleteVendor", "/logistics/vendors/"],
    ["products-services/products-services", "deleteService", "/logistics/products-services/"],
    ["transporters/transporter", "deleteTransporter", "/logistics/transporters/"],
    ["warehouse-master/warehouse-master", "deleteWarehouse", "/logistics/warehouse/"],
  ];

  for (const [path, handler, endpoint] of modules) {
    const [ts, html] = await Promise.all([read(`${path}.component.ts`), read(`${path}.component.html`)]);
    assert.match(ts, new RegExp(`protected ${handler}\\(`), path);
    assert.match(ts, /window\.confirm\(/, path);
    assert.match(ts, new RegExp(`api\\.delete[^\n]+${endpoint.replaceAll("/", "\\/")}`), path);
    assert.match(html, new RegExp(`${handler}\\(item|${handler}\\(row`), path);
  }
});

test("Documents exposes metadata edit/delete and reports lookup failures", async () => {
  const [ts, html] = await Promise.all([
    read("documents/logistics-documents.component.ts"),
    read("documents/logistics-documents.component.html"),
  ]);
  assert.match(ts, /protected editDocument\(/);
  assert.match(ts, /api\.patch[^\n]+\/logistics\/documents\//);
  assert.match(ts, /protected deleteDocument\(/);
  assert.match(ts, /window\.confirm\(/);
  assert.match(ts, /api\.delete[^\n]+\/logistics\/documents\//);
  assert.doesNotMatch(ts, /catchError\(\(\) => of\(null\)\)/);
  assert.match(html, /editDocument\(item\)/);
  assert.match(html, /deleteDocument\(item\)/);
});

test("CHA master, dashboard, and shipment dropdowns share the dedicated CHA source", async () => {
  const sources = await Promise.all([
    read("cha-master/cha-master.component.ts"),
    read("cha/cha.component.ts"),
    read("shipments/air-cargo/air-cargo-new/air-cargo-new.component.ts"),
    read("shipments/sea-freight/sea-freight.component.ts"),
  ]);
  for (const source of sources) {
    assert.match(source, /\/logistics\/cha\/masters/);
    assert.doesNotMatch(source, /\/logistics\/vendors[^\n]*vendorType[^\n]*cha/);
  }
  assert.doesNotMatch(sources[1], /\/logistics\/cha\/masters[^\n]*status:\s*'active'/);
  assert.match(sources[1], /activeCha/);
});

test("Products/Services consumes supported list response envelopes without fake fallback rows", async () => {
  const source = await read("products-services/products-services.component.ts");
  assert.match(source, /if \(Array\.isArray\(response\)\)/);
  assert.match(source, /if \(Array\.isArray\(data\)\)/);
  assert.match(source, /data\?\.data \|\| data\?\.records \|\| response\?\.records \|\| \[\]/);
  assert.doesNotMatch(source, /demo|fake product|sample service/i);
});

test("shipment tables use shared actions with backend row IDs", async () => {
  const [airTs, airHtml, seaTs, seaHtml] = await Promise.all([
    read("shipments/air-cargo/air-cargo-list/air-cargo-list.component.ts"),
    read("shipments/air-cargo/air-cargo-list/air-cargo-list.component.html"),
    read("shipments/sea-freight/sea-freight.component.ts"),
    read("shipments/sea-freight/sea-freight.component.html"),
  ]);
  for (const source of [airTs, seaTs]) assert.match(source, /LogisticsTableActionsComponent/);
  assert.match(airHtml, /<app-logistics-table-actions/);
  assert.match(airHtml, /\[rowId\]="shipment\.mongoId"/);
  assert.match(airHtml, /secondaryAction/);
  assert.doesNotMatch(airHtml, /<details|class="action-dropdown"|class="menu-trigger"/);
  assert.match(seaHtml, /<app-logistics-table-actions/);
  assert.match(seaHtml, /\[rowId\]="shipment\.mongoId"/);
  assert.doesNotMatch(seaHtml, /<button[\s\S]{0,100}?>\s*&#43;\s*<\/button>/);
});

test("master data tables use shared actions and move delete into More", async () => {
  const modules = [
    ["cha-master/cha-master", /\[rowId\]="row\._id \|\| ''"/],
    ["cha/cha", /\[rowId\]="item\._id \|\| ''"/],
    ["transporters/transporter", /\[rowId\]="item\._id \|\| ''"/],
    ["warehouse-master/warehouse-master", /\[rowId\]="row\._id \|\| ''"/],
    ["customers/logistics-customers", /\[rowId\]="item\.raw\?\._id \|\| item\._id \|\| ''"/],
    ["vendors/logistics-vendors", /\[rowId\]="item\.raw\?\._id \|\| item\._id \|\| ''"/],
    ["products-services/products-services", /\[rowId\]="item\.raw\?\._id \|\| item\._id \|\| ''"/],
  ];
  for (const [path, idPattern] of modules) {
    const [ts, html] = await Promise.all([read(`${path}.component.ts`), read(`${path}.component.html`)]);
    assert.match(ts, /LogisticsTableActionsComponent/, path);
    assert.match(html, /<app-logistics-table-actions/, path);
    assert.match(html, idPattern, path);
    assert.doesNotMatch(html, /title="Delete"/, path);
  }
});
