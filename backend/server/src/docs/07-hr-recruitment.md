# Recruitment Module API Documentation

Status: Production Ready

Base URL

/hr/recruitment

Authentication

Bearer Token Required

Permissions

HR
Company Admin

---

# Dashboard

GET /dashboard

Description

Recruitment Dashboard

Response

- Open Jobs
- Total Candidates
- Shortlisted
- Selected
- Interviews Today
- Recruitment Funnel

---

# Job Openings

POST /jobs

Create Job Opening

GET /jobs

List Job Openings

Supports

page

limit

status

departmentId

designationId

branchId

search

GET /jobs/:id

Job Details

PATCH /jobs/:id

Update Job

PATCH /jobs/:id/status

Update Status

Status Values

draft

open

paused

closed

filled

cancelled

DELETE /jobs/:id

Delete Job

---

# Candidates

POST /candidates

Create Candidate

GET /candidates

Candidate List

Supports

page

limit

status

source

appliedJobId

recruiterId

search

GET /candidates/:id

Candidate Details

PATCH /candidates/:id

Update Candidate

PATCH /candidates/:id/status

Update Candidate Status

Status Values

applied

shortlisted

interview_scheduled

interviewed

selected

offer_sent

offer_accepted

joined

rejected

on_hold

no_show

DELETE /candidates/:id

Delete Candidate

---

# Interviews

POST /interviews

Schedule Interview

GET /interviews

Interview List

Supports

page

limit

candidateId

jobOpeningId

status

result

GET /interviews/:id

Interview Details

PATCH /interviews/:id

Update Interview

PATCH /interviews/:id/result

Update Interview Result

Result

pending

pass

fail

hold

reschedule

DELETE /interviews/:id

Delete Interview

---

# Offer Letters

POST /offers

Create Offer

GET /offers

Offer List

Supports

page

limit

status

candidateId

jobOpeningId

GET /offers/:id

Offer Details

PATCH /offers/:id

Update Offer

PATCH /offers/:id/status

Offer Status

draft

sent

accepted

rejected

expired

cancelled

DELETE /offers/:id

Delete Offer

---

# Candidate Conversion

POST /candidates/:id/accept-offer

Accept Offer

GET /candidates/:id/conversion-preview

Preview Conversion

Response

Candidate

Offer

Job

Can Convert

POST /candidates/:id/convert

Convert Candidate to Employee

Automatically

✓ Create User

✓ Generate Employee Code

✓ Create Employee

✓ Create Login

✓ Temporary Password

✓ Link Candidate

✓ Welcome Email

Response

Employee

User

Temporary Password

---

# Security

All APIs require

Bearer Token

Tenant Validation

Company Isolation

Permission Validation

---

# Audit

Created By

Updated By

Created At

Updated At

---

# Pagination

?page=1

&limit=20

---

# Search

?search=

---

# Filters

status

departmentId

designationId

branchId

jobOpeningId

candidateId

source

recruiterId

---

# Sorting

Newest First

---

# Multi Tenant

Company Data Isolation

Enabled

---

# Permission Matrix

Company Admin

✓ Full Access

HR

✓ Full Access

Manager

Read Only (Optional)

Employee

No Access

---

# Recruitment Workflow

Job Opening

↓

Candidate Applied

↓

Resume Screening

↓

Interview Round 1

↓

Interview Round 2

↓

HR Interview

↓

Offer Sent

↓

Offer Accepted

↓

Convert To Employee

↓

Employee Master

↓

Login Created

↓

Welcome Email
