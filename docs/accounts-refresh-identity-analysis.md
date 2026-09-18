# Accounts refresh identity investigation

## Confirmed cause and limits

The authentication flow had two independent identities after a browser reload:
the cached `user` used by the frontend and the cookie-authenticated user used by
the API. There was no authenticated rehydration step to reconcile them before
protected routes and profile requests ran. This is not an Accounts-shell identity
override.

The regression reproduces an Accounts login followed by reload with an HR access
cookie: the profile request returns the HR user before the fix. Both remembered
and session-only login fail. It also reproduces cached HR data overriding an
active Accounts session and a refresh response silently accepting another subject.

The user subsequently confirmed that Accounts and HR were logged in through
separate tabs in the same browser profile. Those tabs share authentication cookies
and localStorage. The HR login can replace both the cookie and remembered user,
so comparing them alone cannot establish which user previously owned the Accounts
tab. A two-tab regression reproduces this gap in the first fix. The actual browser's
HttpOnly cookies were not inspected; there was no connected browser available.
Running Node command lines confirm that the local frontend/backend processes use
this checkout.

## Complete flow before the fix

1. `auth.controller.js:login` authenticates the requested user, creates an
   `AuthSession`, sets HttpOnly access/refresh cookies, and returns tokens plus
   `toSafeObject()` user data. The frontend normalizes `_id` and populated company
   data, holds tokens in memory, and writes user data to the selected storage.
   Login clears the other storage's user entry.
2. `rememberSession=true` selects localStorage; otherwise sessionStorage is used.
   `AuthService` deliberately removes legacy persisted tokens on construction
   and session writes. Reload therefore has no bearer token. The old constructor
   nevertheless marked the stored user as current, and `isLoggedIn()` accepted it.
3. The interceptor attaches a bearer header only if an in-memory token exists.
   API requests include credentials. After reload the backend's `requireAuth`
   falls back to the access cookie, verifies it, and loads `User.findById(sub)`.
   A valid HR access cookie succeeds immediately; no refresh or 401 is necessary.
4. For an invalid/expired access cookie, a non-auth request's 401 triggers refresh.
   The refresh endpoint prefers the HttpOnly refresh cookie, verifies its signature,
   and loads its subject. It does not choose a user from an employee list.
5. Rotation locates the session by user ID, refresh-token hash and non-revoked
   status, revokes it and generates a new session. Previously the response
   contained tokens/session ID but no user. `storeSession()` then updated tokens
   without updating identity, and `getCurrentUser()` preferred storage over JWT
   claims. A cookie/user mismatch could persist across retries.
6. `/hr/employees/dashboard` is a shared employee endpoint, not a lookup of an HR
   employee by department. Its route applies authentication, tenant and permission
   middleware. The controller passes `req.user` to the service. The service passes
   company ID, authenticated user ID, employee link and employee code to the
   repository, and returns that same authenticated user's name/email/role.
7. `findEmployeeProfile()` prioritizes `{companyId, userId}`, then scoped employee
   ID, employee code and (for callers supplying it) official email. It returns null
   if unmatched. It never selects the first employee. The company-only
   `findLastEmployeeByCompany()` query is for generating employee codes, not the
   current profile. No profile-query change is justified by this investigation.
8. Accounts `/employee?feature=profile` embeds `EmployeeDashboardComponent` without
   substituting user context. Normal self-view loads the shared dashboard endpoint;
   preview employee/company query parameters are absent in the reported URL.
   Profile labels prefer the returned employee, then dashboard user, then auth
   signal. Thus a cookie-authenticated HR response is enough to show HR data while
   the Accounts shell remains visible. The component does not write auth identity.
9. AuthService writes identity during login/session storage, getters and profile
   image updates. HR `syncCurrentUser()` and company-admin company/profile sync
   routines also write the signal and localStorage directly. They are not executed
   by the embedded Accounts employee component. Their same-user display updates
   remain supported; browser storage cannot replace an established session user.

## Correction

- `app.config.ts` waits for `AuthService.restoreSession()` before initial routing.
- `auth.service.ts` treats cached identity only as a continuity check for cookie
  restoration. A successful refresh establishes the memory token, current user
  and selected storage together. Both user ID and company are checked before
  accepting a refreshed response. A token-only response uses token identity,
  never stale cached profile fields. Failed restoration clears cached identity;
  protected routing requires login. A ten-second timeout bounds startup waiting
  if the refresh request stalls. Tokens remain memory-only.
- Each login also keeps its user snapshot and remember preference in that tab's
  sessionStorage, including remembered logins. Reload prioritizes this snapshot
  over shared localStorage. A getter cannot overwrite another user's remembered
  session. Rejection keeps this tab signed out across further reloads and does not
  delete another user's remembered login. Existing tabs already showing the wrong
  user need a fresh explicit login to establish their intended identity.
- `token.interceptor.ts` clears only local state on failed refresh. It does not
  call server logout, which could revoke a cookie belonging to another tab.
- `auth.controller.js` rejects an expected-user/verified-subject mismatch before
  user lookup or refresh rotation and returns the sanitized authenticated user
  with populated company/role data. The client hint can only reject; it cannot
  select or authenticate another user. Existing cookie settings, optional
  cookie/body token transport and rotation mechanics are preserved.

If the refresh cookie actually belongs to a different person, the safe result is
re-authentication. The application cannot recover the intended person's session
by rewriting localStorage. Deploy the frontend and backend changes together.

HR, Logistics, Sales and Purchase destinations and department-resolution logic
are unchanged. The user's pre-existing login edit routing employees through
`/employee/dashboard` is preserved. Both employee route aliases have the
department guard; the existing routing assertion was updated to the selected
canonical path. Tenant queries, Accounts layout and employee embedding are unchanged.

## Verification

Run from `frontend/crm-frontend`:

```text
node --test tests/auth-session-rehydration.test.mjs tests/accounts-identity-routing.test.mjs tests/employee-routing.test.mjs tests/accounts-my-employee-frontend.test.mjs
npm.cmd run build
```

The initial regression run had six expected failures before production changes,
including `actual: hr-user; expected: accounts-user` in both storage modes.
The final focused suite has 36 passing tests. It covers bootstrap, bearer requests,
401 retry, mismatch rejection, selected storage, HR identity/profile updates,
role destinations, scoped profile selection and actual JWT generation/rotation
with an in-memory session repository. Tests make no database or live API calls.
Five additional regressions cover all four two-tab remember-preference combinations
and getters preserving the other tab's remembered identity. Four failed before
the follow-up fix. The 401 mismatch test also proves no server logout is sent.

The production Angular build passed outside the sandbox (the sandbox denied
compiler directory traversal). It reports Sass `darken()` deprecation warnings
and a 3.89 MB initial bundle above the 3.50 MB warning threshold, below the 4 MB
error threshold. `git diff --check` passed.

An additional run of `hr-sales-logistics-access.test.mjs` has three existing
failures: assertions expect Logistics, Sales and CRM navigation markup that is
absent from the current HR template. The test and both HR component files match
HEAD; these failures are unrelated to this change and were not changed to pass.

No production browser session or database was accessed or modified. Real deployed
cookie behavior and the reported named users still need verification in the
affected browser after deployment.

The existing cookie design supports one browser-profile cookie session, not two
independent persistent logins. Use separate browser profiles for simultaneous HR
and Accounts testing. On conflict, this fix requires the older tab to log in again
instead of displaying the other user's profile.
