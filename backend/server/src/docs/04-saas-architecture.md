# SaaS Architecture

Status: Completed

## Roles

super_admin  
company_admin  
hr  
support  
employee  

## Tenant Rule

Every company-owned record must include:

companyId

## Access Rule

Super Admin can access platform data.
Company Admin can access own company.
HR can access own company users.
Support and Employee get limited self access.

## JWT

JWT contains:

userId  
role  
companyId  
isPlatformUser  
permissions  

## Data Isolation

Every future module must filter by companyId.