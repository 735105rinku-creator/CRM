import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import '@angular/compiler';
import * as core from '@angular/core';
import * as interop from '@angular/core/rxjs-interop';
import * as common from '@angular/common';
import * as router from '@angular/router';
import * as http from '@angular/common/http';
import * as rx from 'rxjs';

const root = path.resolve(import.meta.dirname, '..');
const source = (file) => path.join(root, 'src/app', file);
function load(file, dependencies, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  }).outputText;
  vm.runInNewContext(js, { exports, require: (name) => dependencies[name] ?? {}, console, atob, btoa, ...globals });
  return exports;
}
const makeStorage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
};
const company = { _id: 'company-a', companyName: 'Fixture Company', logo: '/uploads/company-logos/company.png' };
const rawUser = { _id: 'user-a', name: 'Employee A', companyId: company, employee: 'employee-a', role: 'employee', profileImage: '' };
const employee = { _id: 'employee-a', companyId: 'company-a', userId: 'user-a', employeePhoto: '/uploads/employee-photos/photo.png' };
const token = `e30.${Buffer.from(JSON.stringify({ sub: 'user-a', companyId: 'company-a', role: 'employee', exp: 4102444800 })).toString('base64url')}.test`;

async function fixture({ reload = false, response, apiError = false, pending = false, photo = employee.employeePhoto } = {}) {
  const globals = { localStorage: makeStorage(), sessionStorage: makeStorage() };
  globals.window = { sessionStorage: globals.sessionStorage, __APP_CONFIG__: { API_BASE_URL: 'http://localhost:8080' } };
  // Use the real apiUrl implementation, AuthService normalization and rehydration.
  const config = load(source('core/config/api.config.ts'), {}, globals);
  const deps = { '@angular/core': core, '@angular/core/rxjs-interop': interop, '@angular/common': common, '@angular/common/http': http, '@angular/router': router, rxjs: rx, '../config/api.config': config };
  const { AuthService } = load(source('core/auth/auth.service.ts'), deps, globals);
  const authHttp = { post: () => rx.of({ data: { accessToken: token, user: rawUser } }) };
  let auth = new AuthService(authHttp, {}, 'browser');
  await rx.firstValueFrom(auth.login('employee@example.test', 'fixture', 'employee', true));
  if (reload) {
    auth = new AuthService(authHttp, {}, 'browser');
    await rx.firstValueFrom(auth.restoreSession());
  }
  const subject = new rx.Subject();
  const requests = [];
  class ApiService {}
  const api = { get: (url) => {
    requests.push(url);
    return pending ? subject : apiError ? rx.throwError(() => new Error('unavailable')) : rx.of(response ?? { user: { id: 'user-a' }, employee: { ...employee, employeePhoto: photo } });
  } };
  const cleanup = new Set();
  const destroyRef = { destroyed: false, onDestroy: (fn) => { cleanup.add(fn); return () => cleanup.delete(fn); } };
  const injected = { ...core, inject: (type) => type === AuthService ? auth : type === ApiService ? api : type === core.DestroyRef ? destroyRef : {} };
  const { AccountsShellComponent } = load(source('features/accounts/layout/accounts-shell.component.ts'), {
    ...deps, '@angular/core': injected,
    '../../../core/auth/auth.service': { AuthService }, '../../../core/config/api.config': config,
    '../../../core/services/api.service': { ApiService }
  }, globals);
  const { AccountsSidebarComponent } = load(source('features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts'), {
    ...deps, '@angular/core': injected,
    '../../../../core/auth/auth.service': { AuthService }, '../../../../core/config/api.config': config
  }, globals);
  const shell = new AccountsShellComponent();
  shell.ngOnInit?.();
  return { auth, shell, sidebar: new AccountsSidebarComponent(), requests, subject, destroy: () => { destroyRef.destroyed = true; for (const fn of cleanup) fn(); } };
}

for (const reload of [false, true]) {
  test(`Accounts uses the authenticated employee photo after ${reload ? 'reload' : 'login'}`, async () => {
    const f = await fixture({ reload });
    assert.equal(f.shell.userProfileImage(), 'http://localhost:8080/uploads/employee-photos/photo.png');
    assert.deepEqual(f.requests, ['/hr/employees/dashboard']);
    assert.equal(f.auth.currentUser().profileImage, '', 'do not copy Employee data into the User session');
    assert.equal(f.sidebar.companyLogo(), 'http://localhost:8080/uploads/company-logos/company.png');
    assert.equal(f.shell.userName(), 'Employee A');
  });
}

test('employee photo takes priority over a separate user profile image', async () => {
  const f = await fixture();
  f.auth.currentUser.set({ ...f.auth.currentUser(), profileImage: '/uploads/profile-images/user.png' });
  assert.equal(f.shell.userProfileImage(), 'http://localhost:8080/uploads/employee-photos/photo.png');
});

test('an employee photo with an absolute URL is not prefixed twice', async () => {
  const f = await fixture({ photo: 'https://cdn.example.test/photo.webp' });
  assert.equal(f.shell.userProfileImage(), 'https://cdn.example.test/photo.webp');
});

for (const [name, response] of [
  ['different authenticated user', { user: { id: 'user-b' }, employee }],
  ['different employee user link', { user: { id: 'user-a' }, employee: { ...employee, userId: 'user-b' } }],
  ['different company', { user: { id: 'user-a' }, employee: { ...employee, companyId: 'company-b' } }],
  ['unlinked unrelated employee', { user: { id: 'user-a' }, employee: { ...employee, _id: 'employee-b', userId: null } }]
]) {
  test(`Accounts does not display a photo from a ${name}`, async () => {
    const f = await fixture({ response });
    assert.equal(f.shell.userProfileImage(), '');
    assert.equal(f.shell.userInitial(), 'E');
  });
}

test('an authenticated employee ID is accepted for a legacy record without a user link', async () => {
  const f = await fixture({ response: { user: { id: 'user-a' }, employee: { ...employee, userId: null } } });
  assert.equal(f.shell.userProfileImage(), 'http://localhost:8080/uploads/employee-photos/photo.png');
});

for (const options of [{ photo: '' }, { apiError: true }]) {
  test(`missing or unavailable employee photo retains initials (${JSON.stringify(options)})`, async () => {
    const f = await fixture(options);
    assert.equal(f.shell.userProfileImage(), '');
    assert.equal(f.shell.userInitial(), 'E');
    f.auth.currentUser.set({ ...f.auth.currentUser(), profileImage: '/uploads/profile-images/user.png' });
    assert.equal(f.shell.userProfileImage(), '', 'a separate User image must not replace the missing Employee photo');
  });
}

test('image failures use the existing fallback and new URLs can render', async () => {
  const f = await fixture();
  assert.notEqual(f.shell.userProfileImage(), '');
  f.shell.onProfileImageError();
  assert.equal(f.shell.userProfileImage(), '');
  f.sidebar.onCompanyLogoError();
  assert.equal(f.sidebar.companyLogo(), '');
  f.auth.currentUser.set({ ...f.auth.currentUser(), company: { ...f.auth.currentUser().company, logoUrl: 'http://localhost:8080/uploads/company-logos/new.png' } });
  assert.equal(f.sidebar.companyLogo(), 'http://localhost:8080/uploads/company-logos/new.png');
});

test('a late employee response cannot display a previous user photo', async () => {
  const f = await fixture({ pending: true });
  f.auth.currentUser.set({ ...f.auth.currentUser(), id: 'user-b' });
  f.subject.next({ user: { id: 'user-a' }, employee });
  assert.equal(f.shell.userProfileImage(), '');
});

test('destroying the Accounts shell cancels the pending profile request', async () => {
  const f = await fixture({ pending: true });
  assert.equal(f.subject.observed, true);
  f.destroy();
  assert.equal(f.subject.observed, false);
});
