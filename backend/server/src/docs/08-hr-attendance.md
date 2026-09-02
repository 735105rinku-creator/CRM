# Attendance Module API Documentation

Status: Production Ready (Phase 1)

Base URL

/hr/attendance

Authentication

Bearer Token Required

Permissions

Company Admin
HR
Manager (Read)
Employee (Own Attendance)

---

# Dashboard

GET /dashboard

Description

Attendance dashboard summary.

Response

- Present Today
- Absent Today
- Late Today
- Half Day Today
- On Leave Today
- Attendance Summary
- Monthly Attendance Statistics

---

# Shift Management

POST /shifts

Create Shift

GET /shifts

List Shifts

Query Parameters

page

limit

search

isActive

PATCH /shifts/:id

Update Shift

DELETE /shifts/:id

Delete Shift

Shift Fields

- Shift Name
- Shift Code
- Shift Type
- Start Time
- End Time
- Break Minutes
- Grace Minutes
- Half Day Minutes
- Full Day Minutes
- Weekly Off Days
- Default Shift
- Active Status

---

# Attendance Policy

POST /policies

Create Attendance Policy

GET /policies

List Attendance Policies

Query Parameters

page

limit

search

isActive

PATCH /policies/:id

Update Attendance Policy

DELETE /policies/:id

Delete Attendance Policy

Policy Fields

- Grace Minutes
- Max Late Per Month
- Late Action
- Half Day Minutes
- Regularization Limit
- Overtime Allowed
- Overtime Rule
- Biometric Required
- GPS Required
- Selfie Required
- Web Check-in
- Mobile Check-in
- Auto Mark Absent
- Auto Mark Half Day

---

# Daily Attendance

POST /check-in

Employee Check In

Request

- Employee
- Date
- Shift
- Attendance Policy
- Check In Time
- Source
- GPS Location
- Selfie
- Remarks

---

POST /check-out

Employee Check Out

Request

- Employee
- Date
- Check Out Time
- Source
- GPS Location
- Selfie
- Remarks

Automatically Calculates

✓ Working Hours

✓ Late Minutes

✓ Half Day

✓ Overtime

✓ Attendance Status

---

POST /manual

Manual Attendance Entry

Used By

HR

Company Admin

Request

- Employee
- Date
- Check In
- Check Out
- Work Minutes
- Break Minutes
- Overtime
- Attendance Status
- Remarks

---

GET /records

Attendance List

Query Parameters

page

limit

employeeId

status

from

to

---

PATCH /records/:id/status

Update Attendance Status

Available Status

present

late

half_day

absent

on_leave

holiday

week_off

---

# Attendance Regularization

POST /regularizations

Apply Regularization

Request

- Attendance
- Requested Check In
- Requested Check Out
- Reason
- Attachment
- Employee Remarks

---

GET /regularizations

List Regularization Requests

Filters

page

limit

employeeId

status

---

PATCH /regularizations/:id/status

Approve / Reject Request

Available Status

approved

rejected

cancelled

Manager Remarks Supported

---

# Reports

GET /monthly/:employeeId

Monthly Attendance Report

Query

year

month

Returns

- Daily Attendance
- Present
- Absent
- Late
- Half Day
- Leave
- Total Working Minutes
- Total Overtime

---

# Dashboard Metrics

Today's Present

Today's Absent

Today's Late

Today's Half Day

Today's Leave

Monthly Attendance %

Monthly Working Hours

Monthly Overtime

---

# Attendance Status

present

late

half_day

absent

on_leave

holiday

week_off

---

# Check-in Sources

web

mobile

biometric

manual

---

# Regularization Status

pending

approved

rejected

cancelled

---

# Search

search=

---

# Pagination

?page=1

&limit=20

---

# Sorting

Newest First

---

# Multi Tenant

Company Isolation Enabled

Every Attendance Record Belongs To

Company

Employee

Shift

Attendance Policy

---

# Permissions

Company Admin

✓ Full Access

HR

✓ Full Access

Manager

Read

Approve Regularization

Employee

Own Attendance

Check In

Check Out

Apply Regularization

View Monthly Report

---

# Attendance Workflow

Employee

↓

Check In

↓

Working Hours

↓

Check Out

↓

Attendance Calculated

↓

Late

↓

Half Day

↓

Overtime

↓

Regularization (Optional)

↓

Manager Approval

↓

Monthly Report

↓

Payroll

---

# Phase 2 (Future Enhancements)

Auto Absent Scheduler

Auto Half Day Scheduler

Geo Fence

QR Attendance

Face Recognition

Biometric Device Sync

Attendance Lock

Attendance Unlock

Shift Roster

Notifications

Audit Logs
