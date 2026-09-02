# Module 1 — Authentication Module

## Project

**OPAS CRM Backend**

## Status

**Completed**

---

## 1. Purpose

This module handles complete authentication for the CRM backend.

It provides secure login, logout, refresh token rotation, forgot password, reset password, email verification, account locking, account unlocking, session management, login audit history, and initial admin creation.

This module is the foundation for all upcoming modules such as Employee, HR, Attendance, Leave, Payroll, Notifications, Reports, and Dashboard.

---

## 2. Authentication Flow

```txt
Admin Seed Script
      ↓
Admin Login
      ↓
Access Token + Refresh Token
      ↓
Session Created
      ↓
Admin Creates HR / Support / Employee User
      ↓
User Verifies Email
      ↓
User Login
      ↓
Force Password Change if Required
      ↓
Secure API Access
```

---

## 3. Roles

```txt
admin
hr
support
employee
```

### Role Hierarchy

```txt
Admin
 ├── HR
 ├── Support
 └── Employee
```

---

## 4. Features Completed

| Feature | Status |
|---|---|
| Secure login | Completed |
| Logout | Completed |
| JWT access token | Completed |
| Refresh token | Completed |
| Refresh token rotation | Completed |
| Multi-device session management | Completed |
| Session revocation | Completed |
| Current logged-in user API | Completed |
| Admin creates users | Completed |
| Forgot password | Completed |
| Reset password | Completed |
| Email verification | Completed |
| Change password | Completed |
| First login password change flag | Completed |
| Account lock after failed login attempts | Completed |
| Account unlock via email token | Completed |
| Login audit/history | Completed |
| Login rate limiter | Completed |
| Initial admin seed script | Completed |
| Auth test skeleton | Completed |

---

## 5. Folder Structure Used

```txt
src/
├── config/
│   ├── env.js
│   └── db.js
│
├── constants/
│   └── roles.js
│
├── controllers/
│   └── auth.controller.js
│
├── middleware/
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── rateLimit.middleware.js
│
├── models/
│   ├── User.js
│   ├── AuthSession.js
│   └── LoginAudit.js
│
├── routes/
│   └── auth.routes.js
│
├── scripts/
│   └── createAdmin.js
│
├── services/
│   ├── token.service.js
│   └── email.service.js
│
├── utils/
│   ├── apiError.js
│   ├── apiResponse.js
│   └── asyncHandler.js
│
├── validators/
│   └── auth.validator.js
│
├── app.js
└── index.js
```

---

## 6. Files and Responsibility

### `src/constants/roles.js`

Contains role constants, user status constants, and default permissions for each role.

Roles:

```js
admin
hr
support
employee
```

Statuses:

```js
active
inactive
blocked
```

---

### `src/models/User.js`

Main user account model.

Contains:

- Name
- Email
- Mobile
- Password hash
- Role
- Permissions
- Employee code
- Employee profile reference
- Department
- Designation
- User status
- Email verification fields
- Password reset fields
- Account lock fields
- First login password change flag
- Login attempt counter
- Created by / updated by

Important methods:

```js
setPassword()
verifyPassword()
isLocked()
createSecureToken()
toSafeObject()
```

---

### `src/models/AuthSession.js`

Stores login sessions.

Used for refresh token rotation, multi-device session tracking, logout, and session revoke.

---

### `src/models/LoginAudit.js`

Stores login history.

Status values:

```txt
success
failed
locked
logout
```

---

### `src/services/token.service.js`

Handles token logic:

- Generate access token
- Generate refresh token
- Verify access token
- Verify refresh token
- Hash token
- Create auth session
- Refresh token rotation
- Revoke single session
- Revoke all user sessions

---

### `src/services/email.service.js`

Handles emails for reset password, email verification, and account unlock.

If SMTP is not configured, email sending is skipped and logged in console during development.

---

### `src/middleware/auth.middleware.js`

Authentication and authorization middleware.

Contains:

```js
requireAuth
requireRole
requirePermission
```

---

### `src/middleware/rateLimit.middleware.js`

Contains login rate limiter for:

```txt
POST /auth/login
```

---

### `src/validators/auth.validator.js`

Contains Joi validation schemas for login, create user, update profile, change password, forgot password, and reset password.

Password policy:

```txt
Minimum 8 characters
Maximum 32 characters
At least one uppercase letter
At least one lowercase letter
At least one number
At least one special character
```

---

### `src/controllers/auth.controller.js`

Main auth controller.

Contains login, logout, refresh token, get current user, create user, forgot password, reset password, verify email, unlock account, update profile, change password, get sessions, and revoke session.

---

### `src/routes/auth.routes.js`

Auth routes mounted at:

```txt
/auth
```

---

### `src/scripts/createAdmin.js`

Creates the first admin account.

Default seed account:

```txt
Email: admin@opascrm.com
Password: Admin@123
```

This password must be changed after first login.

---

## 7. API Endpoints

Base URL:

```txt
/auth
```

| Method | Endpoint | Auth Required | Purpose |
|---|---|---|---|
| POST | `/login` | No | Login user |
| POST | `/logout` | Yes | Logout user |
| POST | `/refresh-token` | No | Rotate refresh token |
| GET | `/me` | Yes | Get current logged-in user |
| PATCH | `/profile` | Yes | Update own profile |
| POST | `/change-password` | Yes | Change password |
| POST | `/forgot-password` | No | Send reset password email |
| POST | `/reset-password` | No | Reset password using token |
| POST | `/verify-email` | No | Verify email using token |
| POST | `/unlock-account` | No | Unlock account using token |
| GET | `/sessions` | Yes | Get active login sessions |
| DELETE | `/sessions/:sessionId` | Yes | Revoke one session |
| POST | `/create-user` | Admin only | Create HR / Support / Employee / Admin user |

---

## 8. Security Features

- Password hashing with bcrypt
- JWT access token
- Refresh token rotation
- Session management
- Login audit history
- Account lock after failed login attempts
- Account unlock by email token
- Forgot password flow
- Reset password flow
- Email verification
- Login rate limiter
- HTTP-only cookies
- Sensitive fields hidden from API responses

---

## 9. Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/opas_crm

CLIENT_ORIGIN=http://localhost:4200
APP_NAME=OPAS CRM

JWT_ACCESS_SECRET=change_this_access_secret_very_long
JWT_REFRESH_SECRET=change_this_refresh_secret_very_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECURE=false
BCRYPT_ROUNDS=12

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@opascrm.com

LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

---

## 10. Commands

### Start backend in development

```bash
npm run dev
```

### Start backend in production

```bash
npm start
```

### Create first admin

```bash
npm run create-admin
```

### Run tests

```bash
npm test
```

---

## 11. Create User Flow

```txt
Admin Login
    ↓
POST /api/auth/create-user
    ↓
Create HR / Support / Employee
    ↓
Verification Email Sent
    ↓
User Verifies Email
    ↓
User Logs In
    ↓
Change Password if forcePasswordChange is true
```

---

## 12. Login Flow

```txt
User submits email + password
    ↓
Validate input
    ↓
Find user by email
    ↓
Check account status
    ↓
Check account lock
    ↓
Verify password
    ↓
Create access token
    ↓
Create refresh token
    ↓
Create auth session
    ↓
Save login audit
    ↓
Return user + tokens
```

---

## 13. Refresh Token Flow

```txt
Client sends refresh token
    ↓
Verify refresh token
    ↓
Find active session
    ↓
Revoke old session
    ↓
Create new access token
    ↓
Create new refresh token
    ↓
Create new session
    ↓
Return new tokens
```

---

## 14. Logout Flow

```txt
User logout request
    ↓
Refresh token found
    ↓
Matching session revoked
    ↓
Cookies cleared
    ↓
Logout audit saved
```

---

## 15. Testing

Test file:

```txt
tests/auth.test.js
```

Current test skeleton includes login API, refresh token, logout, forgot password, reset password, verify email, change password, and get current user.

Full automated integration tests can be expanded after stable database test configuration is added.

---

## 16. Important Notes

- There is no public registration endpoint.
- User creation is controlled by admin.
- HR and Support login accounts are created by admin.
- Employee login accounts are also created by admin for now.
- Later, HR can be allowed to create Employee users if required.
- Refresh tokens are stored only as hashes.
- Passwords are never returned in API responses.
- Sensitive token fields are hidden using `select: false`.
- `toSafeObject()` removes sensitive fields before sending response.

---

## 17. Module 1 Result

```txt
Module 1: Authentication Module — COMPLETED
```

Recommended next module:

```txt
Module 2: RBAC / Permission Management
```
