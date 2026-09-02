# Payroll Module API Documentation

Status: Production Ready (Phase 1)

Base URL

/hr/payroll

Authentication

Bearer Token Required

Permissions

Company Admin

HR

---

# Dashboard

GET /dashboard

Returns

Generated Payslips

Paid Payslips

Payroll Summary

---

# Salary Components

POST /components

Create Salary Component

GET /components

List Salary Components

Filters

page

limit

type

isActive

search

PATCH /components/:id

Update Salary Component

DELETE /components/:id

Delete Salary Component

---

# Component Types

earning

deduction

---

# Calculation Types

fixed

percentage

---

# Salary Structure

POST /structures

Create Salary Structure

GET /structures

List Salary Structures

PATCH /structures/:id

Update Salary Structure

DELETE /structures/:id

Delete Salary Structure

---

# Employee Salary

POST /employee-salaries

Assign Salary To Employee

GET /employee-salaries

List Employee Salaries

Filters

employeeId

status

PATCH /employee-salaries/:id

Update Employee Salary

---

# Payroll Run

POST /runs

Create Payroll Run

GET /runs

List Payroll Runs

Filters

month

year

status

POST /runs/:id/process

Process Payroll

Automatically Generates Payslips

PATCH /runs/:id/status

Update Payroll Status

---

# Payroll Status

draft

processed

approved

paid

locked

cancelled

---

# Payslip

GET /payslips

List Payslips

GET /payslips/:id

Payslip Detail

POST /payslips/:id/generate-pdf

Generate Payslip PDF

PATCH /payslips/:id/status

Update Payslip Status

---

# Payslip Status

generated

sent

paid

cancelled

---

# Payroll Flow

Salary Component

↓

Salary Structure

↓

Employee Salary

↓

Payroll Run

↓

Process Payroll

↓

Payslip Generated

↓

Payslip PDF

↓

Salary Paid

↓

Payroll Locked

---

# Payroll Covers

Basic Salary

HRA

Allowances

Bonus

PF

ESI

TDS

Professional Tax

Deductions

Net Salary

---

# Multi Tenant

Company Isolation Enabled

Each payroll record belongs to one company.

---

# Future Enhancements

Attendance-based deduction

Leave without pay deduction

Overtime calculation

Payslip email

Bank payment file

Full and final settlement

Loan and advance

Reimbursement

Tax declaration

Form 16