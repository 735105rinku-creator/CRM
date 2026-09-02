# HR Reports API

Status: Production Ready

Base URL

/api/hr/reports

Authentication

Bearer Token Required

Permissions

Company Admin

HR

Manager (Read Only)

---

# Summary

GET /summary

Returns

Employee Count

Attendance Count

Leave Count

Recruitment Count

Payroll Count

Holiday Count

Event Count

Meeting Count

---

# Employee Reports

GET /employees

Filters

branchId

departmentId

designationId

employeeStatus

from

to

Returns

Employee Master

Employee Directory

Joining Report

Inactive Employees

Branch Report

Department Report

Designation Report

---

# Attendance Reports

GET /attendance

Filters

employeeId

status

from

to

Returns

Daily Attendance

Monthly Attendance

Late Coming

Half Day

Absent Report

Working Hours

Punch Report

---

# Leave Reports

GET /leave

Filters

employeeId

leaveTypeId

status

from

to

Returns

Pending Leave

Approved Leave

Rejected Leave

Cancelled Leave

Leave Register

Leave Balance Report

---

# Recruitment Reports

GET /recruitment

Filters

status

appliedJobId

recruiterId

from

to

Returns

Applications

Candidate Pipeline

Interview Report

Selected Candidates

Rejected Candidates

---

# Job Reports

GET /jobs

Returns

Open Jobs

Closed Jobs

Hiring Summary

Vacancy Summary

---

# Payroll Reports

GET /payroll

Filters

month

year

status

Returns

Payroll Register

Salary Register

Payroll Summary

---

# Payslip Reports

GET /payslips

Filters

employeeId

month

year

status

Returns

Payslip Register

Employee Payslips

Monthly Payslips

---

# Holiday Reports

GET /holidays

Filters

branchId

type

from

to

Returns

Holiday Register

Holiday Calendar

Branch Holiday Report

---

# Event Reports

GET /events

Filters

eventType

status

from

to

Returns

Upcoming Events

Completed Events

Participation Report

---

# Meeting Reports

GET /meetings

Filters

meetingMode

status

organizerId

from

to

Returns

Meeting Register

Meeting Attendance

Action Item Report

Upcoming Meetings

---

# Export (Phase 2)

Excel Export

CSV Export

PDF Export

---

# Analytics (Phase 2)

Monthly Trend

Yearly Trend

Department Summary

Branch Summary

Attendance Trend

Leave Trend

Recruitment Trend

Payroll Trend

---

# Multi Tenant

All reports are isolated by Company.

---

# Future Enhancements

Email Scheduled Reports

Auto Monthly Reports

Excel Templates

Power BI Integration

Dashboard Export

Graph Reports

KPI Reports