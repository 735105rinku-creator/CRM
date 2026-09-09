# Purchase completion implementation plan

Spec: C:/Users/opasb/.codex/attachments/0ff3453c-1f41-4765-80ba-7c479bd16097/pasted-text.txt
Architecture: Complete the existing standalone Purchase workspace using its existing route names. New Purchase-only backend routes/controller/service/repository/models reuse authentication, employee organization roles, Department, LogisticsVendor and LogisticsWarehouse. All DB tests use stubs; never start application bootstrap or perform DB operations.

## Constraints
Read existing files fully and find their references before modifying. Keep all existing exports and behavior. Never modify Logistics/Driver/Accounts business logic. Existing uncommitted Purchase routing and scaffolds are baseline user work. Shared integration only where necessary. No DB operations. No commits or branch changes required.

## Agreed API contract
Base /purchase; standard ApiResponse already unwrapped by ApiService.
GET /access -> {companyId, canCreate, canEdit, canApprove, canDelete, canView:true, employeeId?, userName?, departmentName?}.
GET /lookups -> {vendors:[{_id,name,contactPerson?,phone?,email?,paymentTerms?}], warehouses:[{_id,name,address?}], products:[{_id,name,unit?}]}.
GET /dashboard -> {requests, enquiries, quotations, orders, goodsReceipts, pendingDeliveries, recentActivity:[{_id,number,kind,status,date,vendorName?}], integrationGaps:string[]}.
Resources: requests, vendor-enquiries, quotations, orders, goods-receipts.
GET /:resource?page=1&limit=20&search=&status=&fromDate=&toDate=&requestId=&orderId= -> {data:PurchaseRecord[],pagination:{page,limit,total,totalPages}}.
GET /:resource/:id -> PurchaseRecord.
POST /:resource -> PurchaseRecord; PATCH /:resource/:id -> PurchaseRecord.
PATCH /:resource/:id/status body {status} -> PurchaseRecord. GRN status derived, not manually editable.
DELETE /requests/:id -> soft-delete Draft only; other records retained (cancellation/rejection workflow).
GET /reports?fromDate=&toDate=&status= -> {requests:[{status,count}], enquiries:[{status,count}], quotations:[{status,count}], orders:[PurchaseRecord], receipts:[PurchaseRecord], vendorTotals:[{vendorId,vendorName,total,currency}], integrationGaps:string[]}.

PurchaseRecord fields: _id, number (server assigned), kind, date (ISO date), status, vendorId?,vendorName?,warehouseId?,warehouseName?,requestId?,enquiryId?,quotationId?,orderId?, orderNumber?, requestedByName?,requestingDepartment?,requiredDate?,purpose?,priority?,contactPerson?,phone?,email?,source?,deliveryTime?,paymentTerms?,validUntil?,deliveryAddress?,expectedDeliveryDate?,deliveryChallanNumber?,receivedByName?,remarks?,currency (default INR),freight (default 0),otherCharges(default 0),subtotal,taxTotal,grandTotal,items:PurchaseItem[],editHistory?,createdAt?,updatedAt?.
PurchaseItem: _id? (server stable line id), productId?,description,quantity,unit,unitPrice(default 0),taxRate(default 0),lineTotal?,taxAmount?,orderedQty?,receivedQty?,remainingQty?,orderItemId?,acceptedQty?,rejectedQty?.
GRN submitted items: orderItemId,receivedQty,acceptedQty,rejectedQty; description/unit/order quantity derived from PO. At least one positive receivedQty; accepted+rejected=current received. Order fulfillment counts accepted quantity; total physically received <= ordered quantity; rejected quantities exposed distinctly. This conservative policy prevents over-delivery; remainingQty = ordered - accepted. Explain rejection prevents completion and requires business resolution.
PR statuses draft,pending_approval,approved,rejected; RFQ draft,sent,received,closed; quotation requested,received,selected,rejected; PO draft,approved,sent,partially_received,received,cancelled; GRN partial,completed,rejected (derived).
Initial PR draft, RFQ draft, quotation requested/received, PO draft; transitions enforce approvals by canApprove. Normal Purchase employees create/edit drafts, submit PR, send RFQ, receive quotations, record GRNs against sent/partially_received PO. Management approves/rejects/selects/sends approved PO. Reads company scoped; HR cannot operate. Server validates all linked references same company, business state, and totals. PO lines become immutable after sent/receipt. GRN quantity changes atomically update PO aggregation and history. Approval/status audit uses server identity.

## Tasks
- [ ] 1 Audit/access: root + access worker read current guards/auth/employee/department/permission files. Verify routing priority and fail closed Purchase access. Add mocked access regression tests.
- [ ] 2 Backend: backend worker builds Purchase-only layers and tests validation/workflow/tenant filters, authoritative calculations, numbering concurrency, multiple/partial/rejected receipts and atomic overreceipt protection. Minimum additive app.js mount only after full read/reference audit.
- [ ] 3 Frontend: frontend worker completes empty files using contract, existing shell/sidebar, reactive forms, typed services, actual dashboard/reports, all form/list/action error/loading states. Preserve existing dashboard design; no fake data. Run frontend build.
- [ ] 4 Root integration: review frontend/backend contract alignment, run DB-free tests and actual build, fix Purchase errors, inspect shared diffs, document manual prerequisites and final exact file/route/endpoint report.

## Progress / rulings
Audit: Purchase model/service files and most page files are zero-byte; current dashboard has hardcoded zero cards. No Purchase backend exists. Department schema already allows featureKey purchase; do not seed departments.
Ruling: execute in supplied workspace, preserving user scaffold and uncommitted shared routing work; no relocation or commit of user changes.
