import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shipment modes resolve to their own permission submodule", async () => {
  const { shipmentSubModuleForMode } = await import(
    "../middleware/logisticsPermission.middleware.js"
  );

  assert.equal(shipmentSubModuleForMode("air_cargo"), "airCargo");
  assert.equal(shipmentSubModuleForMode("sea_freight"), "seaFreight");
  assert.throws(() => shipmentSubModuleForMode("road"), /Unsupported shipment mode/);
});

test("shipment mutations use mode-aware permission middleware", () => {
  const routes = read("src/routes/logistics.routes.js");
  assert.match(routes, /requireShipmentPermission\("create"\)/);
  assert.match(routes, /requireShipmentPermission\("edit"\)/);
  assert.match(routes, /requireShipmentPermission\("delete"\)/);
});

test("shipment updates authorize against the stored tenant-scoped mode", () => {
  const middleware = read("src/middleware/logisticsPermission.middleware.js");
  assert.match(middleware, /if \(req\.params\?\.id\)[\s\S]*?shipmentMode = shipment\.shipmentMode;[\s\S]*?else \{\s*shipmentMode = req\.body\?\.shipmentMode;/);
  assert.match(middleware, /companyId,[\s\S]*?isActive: \{ \$ne: false \}/);
});

for (const [file, submodule] of [
  ["logisticsCha.routes.js", "cha"],
  ["logisticsTransporter.routes.js", "transporters"],
  ["logisticsWarehouse.routes.js", "warehouse"],
]) {
  test(`${file} enforces action-level ${submodule} permissions`, () => {
    const source = read(`src/routes/${file}`);
    for (const action of ["view", "create", "edit", "delete"]) {
      assert.match(
        source,
        new RegExp(`requireLogisticsPermission\\(\\s*["']${action}["']\\s*,\\s*["']${submodule}["']`)
      );
    }
  });
}

test("import/export routes distinguish report export from destructive import", () => {
  const source = read("src/routes/logisticsImportExport.routes.js");
  assert.match(source, /requireLogisticsPermission\(\s*["']export["']\s*,\s*["']reports["']/);
  assert.match(source, /requireLogisticsPermission\(\s*["']create["']\s*,\s*["']productsServices["']/);
});
