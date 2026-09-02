# HR Meeting Management API

Status: Production Ready

Base URL

/api/hr/meetings

Authentication

Bearer Token Required

Permissions

Company Admin

HR

Manager

---

# Dashboard

GET /dashboard

Returns

Total Meetings

Upcoming Meetings

---

# Create Meeting

POST /

Fields

Meeting Title

Meeting Code

Meeting Mode

Meeting Link

Venue

Start Date Time

End Date Time

Organizer

Attendees

Agenda

Minutes Of Meeting

Action Items

Notify Attendees

Remarks

Status

---

# List Meetings

GET /

Filters

page

limit

search

meetingMode

status

organizerId

from

to

---

# Meeting Details

GET /:id

---

# Update Meeting

PATCH /:id

---

# Update Meeting Status

PATCH /:id/status

Status

scheduled

completed

cancelled

rescheduled

---

# Delete Meeting

DELETE /:id

---

# Meeting Modes

Online

Offline

Hybrid

---

# Attendee Status

Invited

Accepted

Declined

Attended

Absent

---

# Action Item Status

Pending

In Progress

Completed

---

# Meeting Workflow

Create Meeting

↓

Invite Employees

↓

Notification Sent

↓

Meeting Conducted

↓

Attendance Updated

↓

Minutes Added

↓

Action Items Assigned

↓

Meeting Completed

---

# Dashboard Widgets

Today's Meetings

Upcoming Meetings

Completed Meetings

Cancelled Meetings

Pending Action Items

---

# Integrations

Google Meet

Microsoft Teams

Zoom

Google Calendar

Outlook Calendar

Email Invitation

WhatsApp Notification

Push Notification

---

# Future Features

Recurring Meetings

Room Booking

Meeting Recording

Attendance QR

AI Meeting Notes

Speech To Text

Auto MOM Generation

Task Assignment

Calendar Sync