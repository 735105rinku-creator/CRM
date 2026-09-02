# HR Events API

Base URL

/api/hr/events

Authentication

Bearer Token Required

Permissions

Company Admin

HR

---

## Dashboard

GET /dashboard

Returns

- Total Events
- Upcoming Events

---

## Create Event

POST /

Fields

- Event Title
- Event Code
- Event Type
- Description
- Venue
- Meeting Link
- Banner
- Start DateTime
- End DateTime
- Participants
- Notify Employees
- Status

---

## List Events

GET /

Filters

page

limit

search

eventType

status

from

to

---

## Event Detail

GET /:id

---

## Update Event

PATCH /:id

---

## Update Status

PATCH /:id/status

Status

draft

published

completed

cancelled

---

## Delete Event

DELETE /:id

---

## Event Types

Company Event

Birthday

Work Anniversary

Festival

Holiday

Training

Seminar

Webinar

Townhall

Meeting

Other

---

## Future Features

Google Calendar Sync

Outlook Sync

Zoom Integration

Google Meet

Teams

Email Invitation

WhatsApp Notification

Push Notification

Attendance Capture

QR Check-In