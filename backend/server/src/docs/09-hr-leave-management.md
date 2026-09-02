# Leave Management API Documentation

Status: Production Ready (Phase 1)

Base URL

/hr/leave

Authentication

Bearer Token Required

Permissions

Company Admin

HR

Manager (Approval)

Employee (Own Leave)

---

# Dashboard

GET /dashboard

Description

Leave Dashboard Summary

Returns

Pending Requests

Approved Requests

Rejected Requests

Cancelled Requests

---

# Leave Calendar

GET /calendar

Query

from

to

Returns

Employee

Leave Type

From Date

To Date

Total Days

Status

---

# Leave Type

POST /types

Create Leave Type

GET /types

List Leave Types

Query

page

limit

search

category

isActive

PATCH /types/:id

Update Leave Type

DELETE /types/:id

Delete Leave Type

Fields

Leave Name

Leave Code

Category

Paid

Half Day Allowed

Require Document

Require Approval

Color

Active

---

# Leave Categories

casual

sick

earned

lwp

maternity

paternity

comp_off

optional

other

---

# Leave Policy

POST /policies

Create Leave Policy

GET /policies

List Leave Policies

PATCH /policies/:id

Update Leave Policy

DELETE /policies/:id

Policy Rules

Yearly Quota

Monthly Accrual

Carry Forward

Encashment

Max Consecutive Days

Notice Period

Negative Balance

Backdated Leave

Approval Workflow

---

# Leave Balance

POST /balances

Create Leave Balance

GET /balances

List Leave Balances

Filters

employeeId

leaveTypeId

year

PATCH /balances/:id

Update Leave Balance

Fields

Opening Balance

Credited

Available

Pending

Availed

Rejected

Lapsed

Encashed

Carry Forward

---

# Leave Request

POST /requests

Apply Leave

GET /requests

List Leave Requests

Filters

page

limit

employeeId

leaveTypeId

status

PATCH /requests/:id/status

Approve / Reject / Cancel

---

# Leave Request

Request Fields

Employee

Leave Type

Leave Policy

From Date

To Date

Day Type

Reason

Attachment

---

# Day Type

full_day

half_day_first

half_day_second

---

# Leave Status

pending

approved

rejected

cancelled

---

# Approval Workflow

Employee

↓

Reporting Manager

↓

HR

↓

Company Admin (Optional)

↓

Approved

↓

Leave Balance Updated

---

# Leave Balance Calculation

Opening Balance

+

Credited

+

Carry Forward

-

Availed

-

Pending

=

Available Balance

---

# Dashboard Metrics

Pending

Approved

Rejected

Cancelled

Leave Calendar

Employee Leave Summary

---

# Reports

Employee Leave History

Leave Balance Report

Leave Register

Department Leave Report

Yearly Leave Report

---

# Search

search=

---

# Pagination

?page=1

&limit=20

---

# Multi Tenant

Company Isolation Enabled

All Leave Data Is Company Specific

---

# Permissions

Company Admin

✓ Full Access

HR

✓ Full Access

Manager

Approve Leave

Employee

Apply Leave

View Own Leave

View Own Balance

---

# Current Leave Types

Casual Leave

Yearly Allocation

7 Days

---

Sick Leave

Yearly Allocation

10 Days

---

Earned Leave

Monthly Accrual

1.5 Days

18 Days Per Year

---

Leave Without Pay

Unlimited

Salary Deduction

---

Future Expansion

Comp Off

Maternity Leave

Paternity Leave

Optional Holiday

Bereavement Leave

Marriage Leave

Work From Home Leave

---

# Leave Workflow

Employee

↓

Apply Leave

↓

Leave Balance Validation

↓

Approval Workflow

↓

Approved

↓

Leave Balance Updated

↓

Attendance Updated

↓

Payroll Updated