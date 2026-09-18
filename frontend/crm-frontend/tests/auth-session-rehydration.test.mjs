import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import '@angular/compiler';
import * as core from '@angular/core';
import * as common from '@angular/common';
import * as http from '@angular/common/http';
import * as router from '@angular/router';
import * as forms from '@angular/forms';
import * as rx from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

// Execute production TS/JS; replace only browser storage, HTTP and database boundaries.
const root = path.resolve(import.meta.dirname, '..');
const backend = path.resolve(root, '../../backend/server/src');
const account = { id: 'accounts-user', name: 'Accounts Employee', email: 'accounts@example.test', role: 'employee', companyId: 'tenant-a', department: 'Accounts', permissions: ['view_self'] };
const hr = { id: 'hr-user', name: 'HR Employee', email: 'hr@example.test', role: 'hr', companyId: 'tenant-a', department: 'HR' };
const token = (user) => `e30.${Buffer.from(JSON.stringify({ sub: user.id, companyId: user.companyId, role: user.role, permissions: user.permissions || [], exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')}.test`;
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) };
};
function load(file, dependencies, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => dependencies[name] ?? {}, console, atob, btoa, ...globals }, { filename: file });
  return exports;
}

function fixture(remember = false, cookieUser = account, loginUser = account, sharedStorage = storage()) {
  const localStorage = sharedStorage;
  const sessionStorage = storage();
  const globals = { localStorage, sessionStorage, window: { sessionStorage } };
  const requests = [];
  let refreshUser = cookieUser;
  let stalledRefresh = false;
  const apiConfig = { apiUrl: (url) => `https://api.example.test${url}`, API_BASE_URL: 'https://api.example.test', ENABLE_DEMO_LOGIN: false };
  const dependencies = { '@angular/core': core, '@angular/common': common, '@angular/common/http': http, '@angular/router': router, rxjs: rx, '../config/api.config': apiConfig };
  const { AuthService } = load(path.join(root, 'src/app/core/auth/auth.service.ts'), dependencies, globals);
  const client = { post: (url, body) => rx.defer(() => {
    requests.push({ url, body });
    if (stalledRefresh && url.endsWith('/refresh-token')) return rx.NEVER;
    const user = url.endsWith('/login') ? loginUser : refreshUser;
    return rx.of({ data: { accessToken: token(user), refreshToken: 'opaque-refresh', user, sessionId: 'session' } });
  }) };
  const navigation = { navigate: async () => true, createUrlTree: (commands) => commands[0] };
  let auth = new AuthService(client, navigation, 'browser');
  const inject = (type) => type === AuthService ? auth : navigation;
  async function bootstrap() {
    const initializers = [];
    load(path.join(root, 'src/app/app.config.ts'), {
      ...dependencies,
      '@angular/core': { ...core, inject, provideAppInitializer: (fn) => { initializers.push(fn); return {}; } },
      '@angular/router': { provideRouter: () => ({}), withInMemoryScrolling: () => ({}) },
      './core/auth/auth.service': { AuthService },
      './core/auth/token.interceptor': { tokenInterceptor: () => {} },
      './app.routes': { routes: [] }
    }, globals);
    for (const initialize of initializers) {
      const result = initialize();
      await (rx.isObservable(result) ? rx.firstValueFrom(result) : result);
    }
  }
  return {
    get auth() { return auth; }, localStorage, sessionStorage, requests, dependencies, globals, AuthService,
    login: () => rx.firstValueFrom(auth.login(loginUser.email, 'test-password', loginUser.role, remember)),
    reload: () => { auth = new AuthService(client, navigation, 'browser'); },
    bootstrap, setCookieUser: (user) => { refreshUser = user; },
    stallRefresh: () => { stalledRefresh = true; },
    async dashboard(unauthorizedOnce = false) {
      const { tokenInterceptor } = load(path.join(root, 'src/app/core/auth/token.interceptor.ts'), {
        ...dependencies, '@angular/core': { ...core, inject }, './auth.service': { AuthService }
      }, globals);
      const response = await rx.firstValueFrom(tokenInterceptor(new http.HttpRequest('GET', 'https://api.example.test/hr/employees/dashboard'), (request) => {
        if (unauthorizedOnce) {
          unauthorizedOnce = false;
          return rx.throwError(() => new http.HttpErrorResponse({ status: 401 }));
        }
        // The server prefers bearer identity, otherwise the browser's access cookie.
        const bearer = request.headers.get('Authorization');
        const user = bearer ? [account, hr].find((u) => bearer === `Bearer ${token(u)}`) : cookieUser;
        return rx.of(new http.HttpResponse({ body: { user, employee: { userId: user.id, officialEmail: user.email } } }));
      }));
      return response.body;
    }
  };
}

for (const accountsRemember of [false, true]) {
  for (const hrRemember of [false, true]) {
    test(`another tab's HR login cannot replace Accounts on reload (${accountsRemember}/${hrRemember})`, async () => {
      const shared = storage();
      const accountsTab = fixture(accountsRemember, account, account, shared);
      const hrTab = fixture(hrRemember, hr, hr, shared);
      await accountsTab.login();
      await hrTab.login();
      accountsTab.setCookieUser(hr);
      if (hrRemember) assert.equal(JSON.parse(shared.getItem('user')).id, 'hr-user');
      accountsTab.reload();
      await accountsTab.bootstrap();
      assert.equal(accountsTab.auth.isLoggedIn(), false);
      assert.equal(accountsTab.auth.currentUser(), null);
      assert.equal(accountsTab.requests.at(-1).body.expectedUserId, 'accounts-user');
      // The rejected tab must stay logged out on another reload, not adopt HR.
      accountsTab.reload();
      await accountsTab.bootstrap();
      assert.equal(accountsTab.auth.currentUser(), null);
      hrTab.reload();
      await hrTab.bootstrap();
      assert.equal(hrTab.auth.currentUser().id, 'hr-user');
    });
  }
}

test('an existing tab cannot overwrite another user\'s remembered login through a getter', async () => {
  const shared = storage();
  const accountsTab = fixture(true, account, account, shared);
  const hrTab = fixture(true, hr, hr, shared);
  await accountsTab.login();
  await hrTab.login();
  assert.equal(accountsTab.auth.getCurrentUser().id, 'accounts-user');
  assert.equal(JSON.parse(shared.getItem('user')).id, 'hr-user');
});

for (const remember of [false, true]) {
  test(`Accounts login/reload restores bearer identity before profile requests (remember=${remember})`, async () => {
    const f = fixture(remember, hr); // stale access cookie, current refresh cookie
    f.setCookieUser(account);
    await f.login();
    f.reload();
    await f.bootstrap();
    const dashboard = await f.dashboard();
    assert.equal(dashboard.employee.userId, 'accounts-user');
    assert.equal(dashboard.user.email, 'accounts@example.test');
    assert.equal(f.auth.getCurrentUser().id, 'accounts-user');
    assert.equal(f.auth.currentUser().id, 'accounts-user');
    assert.equal(JSON.parse((remember ? f.localStorage : f.sessionStorage).getItem('user')).id, 'accounts-user');
    assert.equal(JSON.parse(f.sessionStorage.getItem('user')).id, 'accounts-user');
    if (!remember) assert.equal(f.localStorage.getItem('user'), null);
    assert.equal(f.localStorage.getItem('accessToken'), null);
    assert.equal(f.sessionStorage.getItem('refreshToken'), null);
    assert.equal(f.requests.at(-1).body.expectedUserId, 'accounts-user');
  });
}

test('stale stored HR identity cannot override a live Accounts session', async () => {
  const f = fixture();
  await f.login();
  f.sessionStorage.setItem('user', JSON.stringify(hr));
  assert.equal(f.auth.getCurrentUser().id, 'accounts-user');
  assert.equal(JSON.parse(f.sessionStorage.getItem('user')).id, 'accounts-user');
});

test('a stale refresh cookie is rejected rather than switching the active user', async () => {
  const f = fixture(false, hr);
  await f.login();
  await assert.rejects(rx.firstValueFrom(f.auth.refreshToken()), /session|identity/i);
  assert.notEqual(f.auth.currentUser()?.id, 'hr-user');
});

test('reload with a mismatched refresh cookie clears cached identity and requires login', async () => {
  const f = fixture(false, hr);
  await f.login();
  f.reload();
  await f.bootstrap();
  assert.equal(f.auth.isLoggedIn(), false);
  assert.equal(f.auth.currentUser(), null);
  assert.equal(f.sessionStorage.getItem('user'), null);
  assert.equal(f.localStorage.getItem('user'), null);
});

test('a stalled refresh cannot indefinitely block application startup', async () => {
  const f = fixture();
  await f.login();
  f.reload();
  f.stallRefresh();
  const scheduler = new TestScheduler(assert.deepEqual);
  let bootstrapped;
  scheduler.run(() => {
    bootstrapped = f.bootstrap();
    scheduler.schedule(() => {
      assert.equal(f.sessionStorage.getItem('user'), null, 'stalled startup must clear the cached session within 10 seconds');
    }, 10001);
  });
  await bootstrapped;
  assert.equal(f.auth.isLoggedIn(), false);
});

test('refresh synchronizes user, currentUser and storage from the session response', async () => {
  const f = fixture();
  await f.login();
  f.setCookieUser({ ...account, name: 'Updated Accounts Name' });
  await rx.firstValueFrom(f.auth.refreshToken());
  assert.equal(f.auth.getCurrentUser().name, 'Updated Accounts Name');
  assert.equal(f.auth.currentUser().name, 'Updated Accounts Name');
  assert.equal(JSON.parse(f.sessionStorage.getItem('user')).name, 'Updated Accounts Name');
});

test('a 401 refresh retries the profile request with the same authenticated user', async () => {
  const f = fixture();
  await f.login();
  assert.equal((await f.dashboard(true)).employee.userId, 'accounts-user');
  assert.equal(f.requests.filter((r) => r.url.endsWith('/refresh-token')).length, 1);
  assert.equal(f.auth.currentUser().id, 'accounts-user');
});

test('a 401 with a mismatched refresh cookie never returns an HR profile', async () => {
  const f = fixture(false, hr);
  await f.login();
  await assert.rejects(f.dashboard(true), /identity/i);
  assert.equal(f.auth.currentUser(), null);
  assert.equal(f.auth.getAccessToken(), null);
  assert.equal(f.requests.some((request) => request.url.endsWith('/logout')), false,
    'a rejected tab must not revoke the shared cookie session belonging to another user');
});

test('refresh refuses the same user ID from a different tenant', async () => {
  const f = fixture();
  await f.login();
  f.setCookieUser({ ...account, companyId: 'tenant-b' });
  await assert.rejects(rx.firstValueFrom(f.auth.refreshToken()), /identity/i);
  assert.equal(f.auth.currentUser().companyId, 'tenant-a');
});

test('rehydration prioritizes the tab identity over shared remembered data', async () => {
  const f = fixture(false);
  await f.login();
  f.localStorage.setItem('user', JSON.stringify(hr));
  f.reload();
  await f.bootstrap();
  assert.equal(f.auth.currentUser().id, 'accounts-user');
  // A successful explicit cookie refresh may update the shared login preference;
  // it must still authenticate the original tab identity.
  assert.equal(f.requests.at(-1).body.expectedUserId, 'accounts-user');
});

test('HR reload restores the HR identity and preserves same-user profile updates', async () => {
  const f = fixture(false, hr, hr);
  await f.login();
  f.reload();
  await f.bootstrap();
  assert.equal(f.auth.getCurrentUser().id, 'hr-user');
  assert.equal(f.auth.getCurrentUser().role, 'hr');
  f.auth.currentUser.set({ ...f.auth.currentUser(), profileImage: '/uploads/new-avatar.png' });
  assert.equal(f.auth.getCurrentUser().profileImage, '/uploads/new-avatar.png');
});

test('login keeps the HR, employee and operational role destinations', () => {
  const f = fixture();
  const { LoginComponent } = load(path.join(root, 'src/app/features/auth/login/login.component.ts'), {
    ...f.dependencies, '@angular/forms': forms, '../../../core/auth/auth.service': { AuthService: f.AuthService }
  }, f.globals);
  for (const [role, expected] of [['hr', '/hr-dashboard'], ['employee', '/employee/dashboard'], ['accounts', '/accounts/dashboard'], ['logistics', '/logistics/dashboard'], ['sales', '/sales/dashboard'], ['purchase', '/purchase/dashboard']]) {
    assert.equal(LoginComponent.prototype.redirectUrlForRole(role), expected);
  }
});

test('profile lookup uses the authenticated user link, never the first HR employee', async () => {
  const employees = [{ _id: 'hr-profile', userId: 'hr-user', companyId: 'tenant-a' }, { _id: 'accounts-profile', userId: 'accounts-user', companyId: 'tenant-a' }];
  const Employee = {
    findOne: async (query) => employees.find((e) => Object.entries(query).every(([key, value]) => e[key] === value)),
    findById: (id) => { const query = { populate: () => query, lean: async () => employees.find((e) => e._id === id) }; return query; }
  };
  const { findEmployeeProfile } = load(path.join(backend, 'repositories/employee.repository.js'), { '../models/Employee.js': { Employee }, '../constants/roles.js': { ROLES: {} } });
  assert.equal((await findEmployeeProfile({ companyId: 'tenant-a', userId: 'accounts-user', employeeId: 'hr-profile' }))._id, 'accounts-profile');
  assert.equal(await findEmployeeProfile({ companyId: 'tenant-b', userId: 'accounts-user' }), null);
  assert.equal(await findEmployeeProfile({ companyId: 'tenant-a', userId: 'missing' }), null);
});

for (const [department, expected] of [['Accounts', '/accounts/dashboard'], ['Logistics', '/logistics/dashboard'], ['Sales', '/sales/dashboard'], ['Purchase', '/purchase/dashboard']]) {
  test(`${department} employee routing remains ${expected}`, async () => {
    const f = fixture();
    await f.login();
    class ApiService {}
    const api = { get: () => rx.of({ employee: { departmentId: { departmentName: department } }, user: { ...account, department } }) };
    const { employeeDashboardGuard } = load(path.join(root, 'src/app/core/auth/employee-dashboard.guard.ts'), {
      ...f.dependencies, './auth.service': { AuthService: f.AuthService }, '../services/api.service': { ApiService },
      '@angular/core': { ...core, inject: (type) => type === f.AuthService ? f.auth : type === ApiService ? api : { createUrlTree: ([url]) => url } }
    }, f.globals);
    assert.equal(await rx.firstValueFrom(employeeDashboardGuard()), expected);
  });
}

test('backend refresh rejects a different subject before rotation and returns the authenticated user', async () => {
  let rotations = 0;
  let lookups = 0;
  const user = { _id: account.id, status: 'active', toSafeObject: () => account };
  const query = { populate: () => query, then: (resolve) => Promise.resolve(user).then(resolve) };
  const { refreshToken } = load(path.join(backend, 'controllers/auth.controller.js'), {
    '../models/User.js': { User: { findById: () => { lookups++; return query; } } },
    '../constants/roles.js': { USER_STATUS: { ACTIVE: 'active' } },
    '../config/env.js': { env: { COOKIE_SECURE: false } },
    '../utils/apiError.js': load(path.join(backend, 'utils/apiError.js'), {}),
    '../utils/apiResponse.js': load(path.join(backend, 'utils/apiResponse.js'), {}),
    '../utils/asyncHandler.js': { asyncHandler: (handler) => handler },
    '../services/token.service.js': { verifyRefreshToken: () => ({ sub: account.id }), rotateRefreshToken: async () => { rotations++; return { accessToken: token(account), refreshToken: 'rotated', sessionId: 'new-session' }; } }
  });
  let result;
  const res = { cookie: () => res, status: () => res, json: (value) => { result = value; } };
  await assert.rejects(refreshToken({ cookies: { refreshToken: 'cookie' }, body: { expectedUserId: hr.id } }, res), (e) => e.statusCode === 401);
  assert.equal(rotations, 0);
  assert.equal(lookups, 0);
  await refreshToken({ cookies: { refreshToken: 'cookie' }, body: { expectedUserId: account.id } }, res);
  assert.equal(rotations, 1);
  assert.equal(result.data.user.id, 'accounts-user');
  assert.equal(result.data.refreshToken, 'rotated');
});

test('refresh rotation keeps the verified user and invalidates the previous session', async () => {
  const requireBackend = createRequire(path.join(backend, '../package.json'));
  const jwt = requireBackend('jsonwebtoken');
  const sessions = [];
  const AuthSession = {
    create: async (data) => { const session = { ...data, _id: String(sessions.length + 1), isRevoked: false, save: async () => {} }; sessions.push(session); return session; },
    findOne: (query) => ({ select: async () => sessions.find((s) => Object.entries(query).every(([key, value]) => s[key] === value)) })
  };
  const service = load(path.join(backend, 'services/token.service.js'), {
    crypto: { default: crypto }, jsonwebtoken: { default: jwt }, '../models/AuthSession.js': { AuthSession },
    '../config/env.js': { env: { JWT_ACCESS_SECRET: 'test-access-secret', JWT_REFRESH_SECRET: 'test-refresh-secret', JWT_ACCESS_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d' } }
  });
  const user = { ...account, _id: account.id };
  const req = { ip: '127.0.0.1', get: () => 'regression-test' };
  const initial = await service.generateAuthTokens({ user, req });
  const rotated = await service.rotateRefreshToken({ oldRefreshToken: initial.refreshToken, user, req });
  assert.equal(service.verifyAccessToken(rotated.accessToken).sub, 'accounts-user');
  assert.equal(service.verifyRefreshToken(rotated.refreshToken).sub, 'accounts-user');
  assert.equal(service.verifyAccessToken(rotated.accessToken).companyId, 'tenant-a');
  assert.notEqual(rotated.refreshToken, initial.refreshToken);
  assert.equal(sessions[0].isRevoked, true);
  assert.equal(await service.rotateRefreshToken({ oldRefreshToken: initial.refreshToken, user, req }), null);
});
