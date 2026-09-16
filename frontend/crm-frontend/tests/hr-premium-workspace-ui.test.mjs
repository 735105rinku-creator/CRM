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

test("HR People workspace exposes premium employee layout hooks", () => {
  for (const hook of [
    "people-toolbar",
    "employee-table-shell",
    "employee-form-section",
    "employee-profile-hero",
    "department-structure-grid"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});

test("HR Attendance and Leave workspaces expose premium operation hooks", () => {
  for (const hook of [
    "attendance-toolbar",
    "attendance-table-shell",
    "leave-summary-grid",
    "leave-approval-queue",
    "leave-calendar-shell"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});

test("HR Payroll and Organization workspaces expose premium operation hooks", () => {
  for (const hook of [
    "payroll-cycle-summary",
    "payroll-toolbar",
    "payroll-table-shell",
    "organization-calendar-grid",
    "organization-upcoming-list"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});

test("HR Communication and Account workspaces expose premium operation hooks", () => {
  for (const hook of [
    "announcement-workspace",
    "message-workspace",
    "message-thread",
    "profile-summary-card",
    "security-card"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});

test("HR workspace defines responsive and accessible premium behavior", () => {
  for (const hook of [
    "@media (max-width: 1024px)",
    "@media (max-width: 768px)",
    ".mobile-nav-open",
    ".hr-mobile-backdrop",
    ":focus-visible"
  ]) {
    assert.match(scss, new RegExp(hook.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(scss, /\.message-workspace[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(scss, /\.hr-mobile-nav-toggle[\s\S]*display:\s*inline-flex/);
});
