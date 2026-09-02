# Module 2 — User Management & RBAC

## Status

Completed

## Purpose

This module manages CRM users and role-based access control.

## Roles

- Admin
- HR
- Support
- Employee

## Business Rules

Admin can:

- Create HR
- View all users
- Update all users
- Delete users
- Block/unblock users
- Reset passwords
- Change roles
- Assign permissions

HR can:

- Create Support
- Create Employee
- View Support and Employee users
- Update Support and Employee users
- Block/unblock Support and Employee users
- Reset Support and Employee passwords

Support can:

- Access only permitted support/profile APIs

Employee can:

- Access only permitted employee/profile APIs

## APIs

Base URL:

```txt
/users