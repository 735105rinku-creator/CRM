# Module 4 — Company Settings

## Status

Completed

## Purpose

Company Settings manages company-wise configuration used by future modules like Employee, Attendance, Leave, Payroll, Accounts and CRM.

This module is multi-tenant. Every record belongs to one company using `companyId`.

---

## Included Features

- Branch Management
- Department Management
- Designation Management
- Holiday Management

---

## Access Rules

### Super Admin

- Can access platform-level routes
- Can bypass tenant checks where required
- Should not normally manage internal company settings directly unless used for support

### Company Admin

- Can create, update, delete and view company settings for own company

### HR

- Can view company settings
- Can use branch/department/designation/holiday data in employee and attendance modules

### Support / Employee

- Limited access based on permission

---

## APIs

Base URL:

```txt
/company-settings


Module 4 - Company Settings API Documentation
Base URL: /company-settings

Branch APIs
Method	Endpoint	Permission	Description
POST	/branches	company:profile-update	Create Branch
GET	/branches	company:profile-read	List Branches
PATCH	/branches/{id}	company:profile-update	Update Branch
DELETE	/branches/{id}	company:profile-update	Delete Branch

Department APIs
Method	Endpoint	Permission	Description
POST	/departments	company:profile-update	Create Department
GET	/departments	company:profile-read	List Departments
PATCH	/departments/{id}	company:profile-update	Update Department
DELETE	/departments/{id}	company:profile-update	Delete Department

Designation APIs
Method	Endpoint	Permission	Description
POST	/designations	company:profile-update	Create Designation
GET	/designations	company:profile-read	List Designations
PATCH	/designations/{id}	company:profile-update	Update Designation
DELETE	/designations/{id}	company:profile-update	Delete Designation

Holiday APIs
Method	Endpoint	Permission	Description
POST	/holidays	company:profile-update	Create Holiday
GET	/holidays	company:profile-read	List Holidays
PATCH	/holidays/{id}	company:profile-update	Update Holiday
DELETE	/holidays/{id}	company:profile-update	Delete Holiday


Authentication
All endpoints require a Bearer JWT access token.
Access

Super Admin: Platform access

Company Admin: Full company settings management
HR: Read-only (recommended)

Support/Employee: Limited or no access
Notes
• All records are isolated using companyId.
• Prefer soft deletes.
• Maintain audit logs.
• Prevent deletion when dependent records exist.
