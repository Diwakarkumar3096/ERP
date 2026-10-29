export interface InventoryCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  item_count?: number;
  asset_count?: number;
  created_at?: string;
}

export interface InventoryStore {
  id: string;
  school_id: string;
  name: string;
  code: string;
  building?: string;
  floor?: string;
  room_number?: string;
  responsible_employee_id?: string;
  incharge_name?: string;
  incharge_emp_id?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  items_count?: number;
  assets_count?: number;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  school_id: string;
  category_id: string;
  category_name?: string;
  category_code?: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: string;
  brand?: string;
  model?: string;
  description?: string;
  min_stock_level: number;
  reorder_level: number;
  max_stock_level: number;
  current_stock: number;
  unit_price: number | string;
  stock_valuation?: number | string;
  default_store_id?: string;
  store_name?: string;
  store_code?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  stock_status?: 'NORMAL' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  created_at?: string;
}

export interface StockTransaction {
  id: string;
  school_id: string;
  item_id: string;
  item_name?: string;
  item_sku?: string;
  unit?: string;
  store_id: string;
  store_name?: string;
  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';
  quantity: number;
  unit_price: number | string;
  total_value: number | string;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  department_id?: string;
  department_name?: string;
  recipient_employee_id?: string;
  recipient_emp_name?: string;
  recipient_name?: string;
  remarks?: string;
  created_by_id?: string;
  recorded_by_name?: string;
  created_at?: string;
}

export interface StockTransfer {
  id: string;
  school_id: string;
  transfer_number: string;
  from_store_id: string;
  from_store_name?: string;
  to_store_id: string;
  to_store_name?: string;
  item_id: string;
  item_name?: string;
  item_sku?: string;
  unit?: string;
  quantity: number;
  transfer_date: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  requested_by_id?: string;
  requested_by_name?: string;
  created_at?: string;
}

export interface StockCount {
  id: string;
  school_id: string;
  store_id: string;
  store_name?: string;
  count_title: string;
  count_date: string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'COMPLETED';
  total_items_counted: number;
  total_variance_qty: number;
  total_variance_value: number | string;
  verified_by_id?: string;
  verified_by_name?: string;
  notes?: string;
  created_at?: string;
}

export interface Asset {
  id: string;
  school_id: string;
  category_id: string;
  category_name?: string;
  asset_code: string;
  name: string;
  serial_number?: string;
  barcode?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_cost: number | string;
  vendor_id?: string;
  vendor_name?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_provider?: string;
  current_condition: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL' | 'UNUSABLE';
  status: 'ACTIVE' | 'IN_USE' | 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'DAMAGED' | 'LOST' | 'DISPOSED' | 'RETIRED';
  current_store_id?: string;
  store_name?: string;
  department_id?: string;
  department_name?: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  assigned_employee_code?: string;
  location_description?: string;
  specifications?: string;
  created_at?: string;
}

export interface AssetAssignment {
  id: string;
  school_id: string;
  asset_id: string;
  employee_id?: string;
  department_id?: string;
  location_room?: string;
  assigned_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  condition_at_assignment: string;
  condition_at_return?: string;
  status: 'ACTIVE' | 'RETURNED';
  remarks?: string;
}

export interface AssetMaintenance {
  id: string;
  school_id: string;
  asset_id: string;
  asset_name?: string;
  asset_code?: string;
  maintenance_date: string;
  maintenance_type: 'PREVENTIVE' | 'CORRECTIVE' | 'REPAIR' | 'REPLACEMENT' | 'INSPECTION';
  description: string;
  vendor_center?: string;
  cost: number | string;
  invoice_number?: string;
  is_under_warranty: boolean;
  next_maintenance_date?: string;
  expense_record_id?: string;
  remarks?: string;
}

export interface Vendor {
  id: string;
  school_id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  category: string;
  status: 'ACTIVE' | 'INACTIVE';
  rating: number | string;
  total_orders?: number;
  total_business_volume?: number | string;
  created_at?: string;
}

export interface PurchaseRequest {
  id: string;
  school_id: string;
  request_number: string;
  department_id?: string;
  department_name?: string;
  requested_by_id?: string;
  requested_by_name?: string;
  request_date: string;
  required_by_date?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  reason?: string;
  estimated_total: number | string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'CANCELLED';
  review_notes?: string;
  items_count?: number;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  school_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_contact?: string;
  vendor_phone?: string;
  request_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  shipping_cost: number | string;
  total_amount: number | string;
  terms_and_conditions?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED' | 'CLOSED';
  items_count?: number;
  receipts_count?: number;
  created_at?: string;
}

export interface GoodsReceipt {
  id: string;
  school_id: string;
  receipt_number: string;
  po_id: string;
  po_number?: string;
  vendor_id: string;
  vendor_name?: string;
  target_store_id: string;
  store_name?: string;
  receipt_date: string;
  challan_number?: string;
  invoice_number?: string;
  total_accepted_value: number | string;
  expense_record_id?: string;
  status: 'COMPLETED';
  remarks?: string;
  received_by_name?: string;
  created_at?: string;
}

export interface InventoryDashboardData {
  items: {
    total_items: number;
    total_stock_quantity: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_inventory_valuation: number | string;
  };
  assets: {
    total_assets: number;
    active_in_use: number;
    available_assets: number;
    under_maintenance: number;
    damaged_lost_assets: number;
    total_asset_valuation: number | string;
  };
  procurement: {
    pending_requests: number;
    active_orders: number;
    total_receipts: number;
  };
  recentMovements: StockTransaction[];
  lowStockList: InventoryItem[];
  categoryBreakdown: {
    id: string;
    name: string;
    code: string;
    item_count: number;
    total_stock: number;
    total_value: number | string;
  }[];
}

export interface InventoryNotification {
  id: string;
  school_id: string;
  user_id?: string | null;
  event_type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PURCHASE_REQUEST' | 'PURCHASE_APPROVAL' | 'PURCHASE_REJECTED' | 'PO_ISSUED' | 'GOODS_RECEIVED' | 'WARRANTY_REMINDER' | 'ASSET_MAINTENANCE';
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  is_read: boolean;
  created_at: string;
}

