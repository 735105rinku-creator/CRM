# Module 3 — Company Management

Status: Completed

## Purpose

Company Management enables multi-company SaaS CRM usage.

## Flow

Super Admin creates Company.
Super Admin creates Company Admin.
Company Admin creates HR.
HR creates Support and Employee.

## APIs

POST /companies  
GET /companies  
GET /companies/:id  
PATCH /companies/:id  
PATCH /companies/:id/status  
DELETE /companies/:id  
POST /companies/:id/company-admin  
GET /companies/my/profile  
PATCH /companies/my/profile