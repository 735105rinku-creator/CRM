# HR Holiday Management API

Status: Production Ready

Base URL

/api/hr/holidays

Authentication

Bearer Token Required

Permissions

Company Admin

HR

---

# Dashboard

GET /dashboard

Returns

Total Holidays

Upcoming Holidays

---

# Create Holiday

POST /

Fields

Holiday Name

Holiday Date

Holiday Type

Description

Branch

Paid Holiday

Active

---

# List Holidays

GET /

Filters

page

limit

search

branchId

type

isActive

from

to

---

# Holiday Details

GET /:id

---

# Update Holiday

PATCH /:id

---

# Delete Holiday

DELETE /:id

---

# Holiday Types

Public Holiday

Company Holiday

Optional Holiday

Festival

---

# Dashboard Widgets

Total Holidays

Upcoming Holidays

Current Month Holidays

Branch Holidays

---

# Calendar View

Monthly Calendar

Yearly Calendar

Upcoming Holidays

Branch Calendar

Festival Calendar

---

# Attendance Integration

Holiday Auto Detection

Weekly Off Support

Present Calculation

Working Day Calculation

---

# Leave Integration

Holiday Between Leave

Exclude Holiday

Sandwich Leave (Future)

Optional Holiday Selection

---

# Payroll Integration

Working Days

Payable Days

LWP Calculation

Salary Calculation

---

# Reports

Holiday Register

Yearly Holiday List

Branch Holiday Report

Festival Report

---

# Multi Tenant

Company Wise Holiday Calendar

Branch Wise Holiday Calendar

---

# Future Enhancements

Import Holiday Excel

Google Calendar Sync

Outlook Calendar Sync

ICS Download

Holiday Notification

Employee Reminder

Regional Holiday Support

Country Wise Holiday Support