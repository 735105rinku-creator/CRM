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

const tsPath = path.join(root, "src/app/features/hr/hr-dashboard.component.ts");
const ts = fs.readFileSync(tsPath, "utf8");

test("HR workspace exposes responsive navigation state", () => {
  assert.match(ts, /isSidebarCollapsed\s*=\s*signal\(false\)/);
  assert.match(ts, /isMobileNavOpen\s*=\s*signal\(false\)/);
  assert.match(ts, /toggleSidebar\s*\(/);
  assert.match(ts, /toggleMobileNav\s*\(/);
  assert.match(ts, /closeMobileNav\s*\(/);
});

const scssPath = path.join(root, "src/app/features/hr/hr-dashboard.component.scss");
const scss = fs.readFileSync(scssPath, "utf8");

test("HR premium SCSS defines shared workspace surfaces", () => {
  assert.match(scss, /--hr-bg:/);
  assert.match(scss, /--hr-surface:/);
  assert.match(scss, /--hr-surface-soft:/);
  assert.match(scss, /--hr-border:/);
  assert.match(scss, /--hr-text:/);
  assert.match(scss, /--hr-muted:/);
  assert.match(scss, /--hr-radius-sm:/);
  assert.match(scss, /--hr-radius-md:/);
  assert.match(scss, /--hr-radius-lg:/);
  assert.match(scss, /--hr-shadow:/);
  assert.match(scss, /--hr-shadow-soft:/);
  assert.match(scss, /\.sidebar-collapsed/);
  assert.match(scss, /\.hr-nav-section/);
});

test("HR dashboard exposes premium command-center structure", () => {
  for (const hook of [
    "hr-command-hero",
    "hr-quick-actions",
    "hr-kpi-grid",
    "hr-dashboard-grid",
    "hr-topbar-profile"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
