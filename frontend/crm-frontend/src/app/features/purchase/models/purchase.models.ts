export type PurchasePriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';


export type PurchaseRequestStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected';


export type VendorEnquirySource =
  | 'indiamart'
  | 'direct_supplier'
  | 'other';


export type VendorEnquiryStatus =
  | 'draft'
  | 'requested'
  | 'received'
  | 'closed'
  | 'cancelled';


export type PurchaseQuotationStatus =
  | 'requested'
  | 'received'
  | 'selected'
  | 'rejected';


export type PurchaseOrderStatus =
  | 'draft'
  | 'approved'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'cancelled';


export type GoodsReceiptStatus =
  | 'received'
  | 'partial'
  | 'rejected'
  | 'completed';


/* ============================================================
   COMMON API TYPES
============================================================ */

export interface PurchaseApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}


export interface PurchasePagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}


export interface PurchaseApiListData<T> {
  rows: T[];
  pagination: PurchasePagination;
}


export interface PurchaseApiListResponse<T> {
  success: boolean;
  message?: string;
  data: PurchaseApiListData<T>;
}


/* ============================================================
   PURCHASE ACCESS
============================================================ */

export interface PurchaseAccess {
  scope:
    | 'department'
    | string;

  employeeCode?: string;

  departmentName?: string;

  departmentCode?: string;

  organizationRole?: string;

  designationName?: string;

  designationCode?: string;

  designationLevel?: number;

  canApprove: boolean;
}


/* ============================================================
   BASIC REFERENCE TYPES
============================================================ */

export interface PurchaseUserReference {
  _id: string;

  name?: string;
  fullName?: string;
  employeeName?: string;

  email?: string;
  employeeCode?: string;
}


export interface PurchaseDepartmentReference {
  _id: string;

  name?: string;
  departmentName?: string;

  code?: string;
  departmentCode?: string;

  featureKey?: string;
}


export interface PurchaseVendorOption {
  _id: string;

  name: string;

  companyName?: string;
  vendorName?: string;
  vendorCode?: string;

  contactPerson?: string;
  phone?: string;
  mobile?: string;
  email?: string;

  source?: VendorEnquirySource | string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;

  isActive?: boolean;
}


export interface PurchaseWarehouseOption {
  _id: string;

  name: string;

  code?: string;

  address?: string;
  city?: string;
  state?: string;
  country?: string;

  isActive?: boolean;
}


/* ============================================================
   ITEM REFERENCES
============================================================ */

export interface PurchaseItemReference {
  _id?: string;

  name: string;

  code?: string;
  sku?: string;

  description?: string;

  unit?: string;
}


/* ============================================================
   PURCHASE REQUEST
============================================================ */

export interface PurchaseRequest {
  _id: string;

  prNumber: string;

  requestDate: string;

  requestedBy:
    | PurchaseUserReference
    | string;

  requestedEmployeeCode?: string;

  requestedByName?: string;

  departmentId?:
    | PurchaseDepartmentReference
    | string
    | null;

  departmentName?: string;

  departmentCode?: string;

  requestingDepartment?:
    | PurchaseDepartmentReference
    | string
    | null;

  item?: PurchaseItemReference | null;

  itemName: string;

  description?: string;

  requiredQuantity: number;

  unit: string;

  requiredDate?: string | null;

  purpose?: string;

  priority: PurchasePriority;

  status: PurchaseRequestStatus;

  remarks?: string;

  submittedAt?: string | null;

  submittedBy?:
    | PurchaseUserReference
    | string
    | null;

  approvedBy?:
    | PurchaseUserReference
    | string
    | null;

  approvedAt?: string | null;

  approvalRemarks?: string;

  rejectedBy?:
    | PurchaseUserReference
    | string
    | null;

  rejectedAt?: string | null;

  rejectionReason?: string | null;

  companyId?: string;

  createdBy?:
    | PurchaseUserReference
    | string;

  updatedBy?:
    | PurchaseUserReference
    | string;

  createdAt?: string;
  updatedAt?: string;
}


export interface PurchaseRequestPayload {
  requestDate?: string;

  itemName: string;

  description?: string;

  requiredQuantity: number;

  unit: string;

  requiredDate?: string | null;

  purpose?: string;

  priority: PurchasePriority;

  remarks?: string;
}


export interface PurchaseRequestFilters {
  search?: string;

  status?: PurchaseRequestStatus | '';

  priority?: PurchasePriority | '';

  requestedBy?: string;

  departmentId?: string;

  fromDate?: string;

  toDate?: string;

  page?: number;

  limit?: number;
}


/* ============================================================
   VENDOR ENQUIRY / RFQ
============================================================ */

export interface VendorEnquiry {
  _id: string;

  companyId?: string;

  enquiryNumber: string;

  rfqNumber?: string;

  purchaseRequestId?: string | null;

  purchaseRequest?:
    | PurchaseRequest
    | string
    | null;

  vendorId: string;

  vendorName: string;

  vendorCode?: string;

  vendor?:
    | PurchaseVendorOption
    | string
    | null;

  contactPerson?: string;

  phone?: string;

  email?: string;

  source: VendorEnquirySource;

  otherSource?: string;

  item?: PurchaseItemReference | null;

  itemName: string;

  quantity: number;

  unit?: string;

  quotedPrice?: number | null;

  taxPercent?: number | null;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  remarks?: string;

  status: VendorEnquiryStatus;

  requestedAt?: string | null;

  requestedBy?:
    | PurchaseUserReference
    | string
    | null;

  receivedAt?: string | null;

  receivedBy?:
    | PurchaseUserReference
    | string
    | null;

  createdBy?:
    | PurchaseUserReference
    | string
    | null;

  updatedBy?:
    | PurchaseUserReference
    | string
    | null;

  createdAt?: string;
  updatedAt?: string;
}


export interface VendorEnquiryPayload {
  purchaseRequestId?: string | null;

  vendorId: string;

  contactPerson?: string;

  phone?: string;

  email?: string;

  source: VendorEnquirySource;

  otherSource?: string;

  itemName: string;

  quantity: number;

  unit?: string;

  quotedPrice?: number | null;

  taxPercent?: number | null;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  remarks?: string;
}


export interface VendorEnquiryFilters {
  search?: string;

  status?: VendorEnquiryStatus | '';

  source?: VendorEnquirySource | '';

  vendorId?: string;

  purchaseRequestId?: string;

  fromDate?: string;

  toDate?: string;

  page?: number;

  limit?: number;

  sortBy?:
    | 'createdAt'
    | 'updatedAt'
    | 'enquiryNumber'
    | 'status'
    | 'vendorName'
    | 'itemName';

  sortOrder?:
    | 'asc'
    | 'desc';
}


export interface VendorEnquiryStatusCounts {
  total: number;

  draft: number;

  requested: number;

  received: number;

  closed: number;

  cancelled: number;
}


export interface ReceiveVendorEnquiryPayload {
  quotedPrice: number;

  taxPercent?: number | null;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  remarks?: string;
}


/* ============================================================
   PURCHASE QUOTATION
============================================================ */

export interface PurchaseQuotationItem {
  _id?: string;

  itemId?: string | null;

  itemName: string;

  description?: string;

  quantity: number;

  unit: string;

  unitPrice: number;

  taxPercent: number;

  taxAmount?: number;

  lineSubtotal?: number;

  lineTotal?: number;
}


export interface PurchaseQuotation {
  _id: string;

  quotationNumber: string;

  rfqNumber?: string;

  purchaseRequest?:
    | PurchaseRequest
    | string
    | null;

  vendorEnquiry?:
    | VendorEnquiry
    | string
    | null;

  vendor:
    | PurchaseVendorOption
    | string;

  quotationDate?: string;

  items: PurchaseQuotationItem[];

  subtotal: number;

  taxTotal: number;

  freightCharges?: number;

  otherCharges?: number;

  grandTotal: number;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  remarks?: string;

  status: PurchaseQuotationStatus;

  selectedAt?: string | null;

  selectedBy?:
    | PurchaseUserReference
    | string
    | null;

  companyId?: string;

  createdBy?:
    | PurchaseUserReference
    | string;

  createdAt?: string;
  updatedAt?: string;
}


export interface PurchaseQuotationPayload {
  purchaseRequestId?: string | null;

  vendorEnquiryId?: string | null;

  vendorId: string;

  quotationDate?: string;

  items: Array<{
    itemId?: string | null;

    itemName: string;

    description?: string;

    quantity: number;

    unit: string;

    unitPrice: number;

    taxPercent: number;
  }>;

  freightCharges?: number;

  otherCharges?: number;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  remarks?: string;
}


export interface PurchaseQuotationFilters {
  search?: string;

  status?: PurchaseQuotationStatus | '';

  vendorId?: string;

  purchaseRequestId?: string;

  fromDate?: string;

  toDate?: string;

  page?: number;

  limit?: number;
}


/* ============================================================
   QUOTATION COMPARISON
============================================================ */

export interface QuotationComparisonRow {
  quotationId: string;

  quotationNumber: string;

  vendorId: string;

  vendorName: string;

  unitPrice?: number;

  subtotal: number;

  taxTotal: number;

  freightCharges: number;

  otherCharges: number;

  grandTotal: number;

  deliveryTime?: string;

  paymentTerms?: string;

  validUntil?: string | null;

  status: PurchaseQuotationStatus;

  isSelected?: boolean;
}


/* ============================================================
   PURCHASE ORDER
============================================================ */

export interface PurchaseOrderItem {
  _id?: string;

  itemId?: string | null;

  itemName: string;

  description?: string;

  orderedQuantity: number;

  receivedQuantity?: number;

  remainingQuantity?: number;

  unit: string;

  unitPrice: number;

  taxPercent: number;

  taxAmount?: number;

  lineSubtotal?: number;

  lineTotal?: number;
}


export interface PurchaseOrder {
  _id: string;

  poNumber: string;

  poDate: string;

  vendor:
    | PurchaseVendorOption
    | string;

  purchaseRequest?:
    | PurchaseRequest
    | string
    | null;

  quotation?:
    | PurchaseQuotation
    | string
    | null;

  vendorEnquiry?:
    | VendorEnquiry
    | string
    | null;

  items: PurchaseOrderItem[];

  subtotal: number;

  taxTotal: number;

  freightCharges?: number;

  otherCharges?: number;

  grandTotal: number;

  deliveryAddress?: string;

  warehouse?:
    | PurchaseWarehouseOption
    | string
    | null;

  expectedDeliveryDate?: string | null;

  paymentTerms?: string;

  status: PurchaseOrderStatus;

  remarks?: string;

  approvedBy?:
    | PurchaseUserReference
    | string
    | null;

  approvedAt?: string | null;

  companyId?: string;

  createdBy?:
    | PurchaseUserReference
    | string;

  createdAt?: string;
  updatedAt?: string;
}


export interface PurchaseOrderPayload {
  vendorId: string;

  purchaseRequestId?: string | null;

  quotationId?: string | null;

  vendorEnquiryId?: string | null;

  poDate?: string;

  items: Array<{
    itemId?: string | null;

    itemName: string;

    description?: string;

    orderedQuantity: number;

    unit: string;

    unitPrice: number;

    taxPercent: number;
  }>;

  freightCharges?: number;

  otherCharges?: number;

  deliveryAddress?: string;

  warehouseId?: string | null;

  expectedDeliveryDate?: string | null;

  paymentTerms?: string;

  remarks?: string;
}


export interface PurchaseOrderFilters {
  search?: string;

  status?: PurchaseOrderStatus | '';

  vendorId?: string;

  purchaseRequestId?: string;

  quotationId?: string;

  warehouseId?: string;

  fromDate?: string;

  toDate?: string;

  page?: number;

  limit?: number;

  sort?:
    | 'poDate'
    | '-poDate'
    | 'createdAt'
    | '-createdAt'
    | 'expectedDeliveryDate'
    | '-expectedDeliveryDate'
    | 'grandTotal'
    | '-grandTotal'
    | 'poNumber'
    | '-poNumber'
    | 'vendorName'
    | '-vendorName';
}


/* ============================================================
   GOODS RECEIPT / GRN
============================================================ */

export interface GoodsReceiptItem {
  _id?: string;

  purchaseOrderItemId: string;

  itemId?: string | null;

  itemName: string;

  description?: string;

  unit: string;

  orderedQuantity: number;

  previouslyReceivedQuantity: number;

  currentReceivedQuantity: number;

  acceptedQuantity: number;

  rejectedQuantity: number;

  remainingQuantity: number;

  rejectionReason?: string;
}


export interface GoodsReceipt {
  _id: string;

  grnNumber: string;

  purchaseOrderId:
    | PurchaseOrder
    | string;

  poNumber: string;

  receiptDate: string;

  vendorId:
    | PurchaseVendorOption
    | string;

  vendorName: string;

  vendorCode?: string;

  warehouseId:
    | PurchaseWarehouseOption
    | string;

  warehouseName: string;

  warehouseCode?: string;

  deliveryChallanNumber?: string;

  items: GoodsReceiptItem[];

  receivedBy?:
    | PurchaseUserReference
    | string;

  receivedByName?: string;

  remarks?: string;

  status: GoodsReceiptStatus;

  companyId?: string;

  createdBy?:
    | PurchaseUserReference
    | string;

  updatedBy?:
    | PurchaseUserReference
    | string;

  createdAt?: string;
  updatedAt?: string;
}


export interface GoodsReceiptPayload {
  purchaseOrderId: string;

  receiptDate?: string;

  warehouseId: string;

  deliveryChallanNumber?: string;

  items: Array<{
    purchaseOrderItemId: string;

    currentReceivedQuantity: number;

    acceptedQuantity: number;

    rejectedQuantity: number;

    rejectionReason?: string;
  }>;

  remarks?: string;
}


export interface GoodsReceiptFilters {
  search?: string;

  status?: GoodsReceiptStatus | '';

  vendorId?: string;

  warehouseId?: string;

  purchaseOrderId?: string;

  fromDate?: string;

  toDate?: string;

  page?: number;

  limit?: number;

  sort?:
    | 'receiptDate'
    | '-receiptDate'
    | 'createdAt'
    | '-createdAt'
    | 'grnNumber'
    | '-grnNumber'
    | 'poNumber'
    | '-poNumber'
    | 'vendorName'
    | '-vendorName';
}


export interface GoodsReceiptStatusCounts {
  received: number;

  partial: number;

  rejected: number;

  completed: number;
}


export interface PurchaseOrderReceiptSummaryItem {
  purchaseOrderItemId: string;

  itemId?: string | null;

  itemName: string;

  unit: string;

  orderedQuantity: number;

  receivedQuantity: number;

  acceptedQuantity: number;

  rejectedQuantity: number;

  remainingQuantity: number;
}


export interface PurchaseOrderReceiptSummary {
  purchaseOrderId: string;

  poNumber: string;

  status: PurchaseOrderStatus;

  vendorId:
    | PurchaseVendorOption
    | string;

  vendorName: string;

  warehouseId?:
    | PurchaseWarehouseOption
    | string
    | null;

  warehouseName?: string;

  grnCount: number;

  items: PurchaseOrderReceiptSummaryItem[];
}


/* ============================================================
   PURCHASE DASHBOARD
============================================================ */

export interface PurchaseDashboardSummary {
  purchaseRequests: number;

  pendingPurchaseRequests?: number;

  quotations: number;

  purchaseOrders: number;

  goodsReceived: number;

  pendingDeliveries: number;

  pendingVendorPayments?: number;

  pendingRequiredQuantity?: number;
}


export interface PurchaseRecentActivity {
  _id?: string;

  reference: string;

  type:
    | 'purchase_request'
    | 'vendor_enquiry'
    | 'quotation'
    | 'purchase_order'
    | 'goods_receipt'
    | string;

  vendor?: string;

  status: string;

  date: string;
}


export interface PurchaseDashboardData {
  summary: PurchaseDashboardSummary;

  recentActivity: PurchaseRecentActivity[];
}


/* ============================================================
   REPORT FILTERS
============================================================ */

export interface PurchaseReportFilters {
  fromDate?: string;

  toDate?: string;

  status?: string;

  vendorId?: string;

  warehouseId?: string;

  departmentId?: string;

  reportType?:
    | 'purchase_requests'
    | 'vendor_enquiries'
    | 'quotations'
    | 'purchase_orders'
    | 'goods_receipts'
    | 'pending_deliveries'
    | 'quantity_tracking'
    | 'vendor_wise'
    | string;
}


/* ============================================================
   DISPLAY HELPERS
============================================================ */

export interface PurchaseStatusOption<
  T extends string = string
> {
  value: T;
  label: string;
}


export const PURCHASE_PRIORITY_OPTIONS:
  PurchaseStatusOption<PurchasePriority>[] = [
    {
      value: 'low',
      label: 'Low'
    },
    {
      value: 'medium',
      label: 'Medium'
    },
    {
      value: 'high',
      label: 'High'
    },
    {
      value: 'urgent',
      label: 'Urgent'
    }
  ];


export const PURCHASE_REQUEST_STATUS_OPTIONS:
  PurchaseStatusOption<PurchaseRequestStatus>[] = [
    {
      value: 'draft',
      label: 'Draft'
    },
    {
      value: 'pending_approval',
      label: 'Pending Approval'
    },
    {
      value: 'approved',
      label: 'Approved'
    },
    {
      value: 'rejected',
      label: 'Rejected'
    }
  ];


export const VENDOR_ENQUIRY_SOURCE_OPTIONS:
  PurchaseStatusOption<VendorEnquirySource>[] = [
    {
      value: 'indiamart',
      label: 'IndiaMART'
    },
    {
      value: 'direct_supplier',
      label: 'Direct Supplier'
    },
    {
      value: 'other',
      label: 'Other'
    }
  ];


export const VENDOR_ENQUIRY_STATUS_OPTIONS:
  PurchaseStatusOption<VendorEnquiryStatus>[] = [
    {
      value: 'draft',
      label: 'Draft'
    },
    {
      value: 'requested',
      label: 'Requested'
    },
    {
      value: 'received',
      label: 'Received'
    },
    {
      value: 'closed',
      label: 'Closed'
    },
    {
      value: 'cancelled',
      label: 'Cancelled'
    }
  ];


export const PURCHASE_QUOTATION_STATUS_OPTIONS:
  PurchaseStatusOption<PurchaseQuotationStatus>[] = [
    {
      value: 'requested',
      label: 'Requested'
    },
    {
      value: 'received',
      label: 'Received'
    },
    {
      value: 'selected',
      label: 'Selected'
    },
    {
      value: 'rejected',
      label: 'Rejected'
    }
  ];


export const PURCHASE_ORDER_STATUS_OPTIONS:
  PurchaseStatusOption<PurchaseOrderStatus>[] = [
    {
      value: 'draft',
      label: 'Draft'
    },
    {
      value: 'approved',
      label: 'Approved'
    },
    {
      value: 'sent',
      label: 'Sent'
    },
    {
      value: 'partially_received',
      label: 'Partially Received'
    },
    {
      value: 'received',
      label: 'Received'
    },
    {
      value: 'cancelled',
      label: 'Cancelled'
    }
  ];


export const GOODS_RECEIPT_STATUS_OPTIONS:
  PurchaseStatusOption<GoodsReceiptStatus>[] = [
    {
      value: 'received',
      label: 'Received'
    },
    {
      value: 'partial',
      label: 'Partial'
    },
    {
      value: 'rejected',
      label: 'Rejected'
    },
    {
      value: 'completed',
      label: 'Completed'
    }
  ];