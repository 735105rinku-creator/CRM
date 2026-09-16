import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(root, "src/app/features/hr/hr-dashboard.component.html");
const html = fs.readFileSync(htmlPath, "utf8");

test("HR premium shell exposes approved workspace structure", () => {
  assert.match(html, /class="[^"]*hr-workspace/);
  assert.match(html, /class="[^"]*hr-sidebar/);
  assert.match(html, /class="[^"]*hr-topbar/);
  assert.match(html, /class="[^"]*hr-content/);
});

test("HR navigation uses the approved HR groups", () => {
  for (const label of [
    "Overview",
    "People",
    "Time & Attendance",
    "Leave",
    "Payroll",
    "Organization",
    "Communication",
    "Account"
  ]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
});

test("HR premium shell has desktop collapse and mobile drawer controls", () => {
  assert.match(html, /hr-nav-toggle/);
  assert.match(html, /hr-mobile-backdrop/);
});
