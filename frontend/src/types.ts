export type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description?: string;
  category: number | null;
  category_name?: string;
  unit: number | null;
  unit_name?: string;
  brand?: string;
  manufacturer?: string;
  cost_price: string;
  selling_price: string;
  wholesale_price: string;
  minimum_stock: string;
  reorder_level: string;
  is_prescription: boolean;
  current_stock: string;
  is_active: boolean;
};

export type Category = { id: number; name: string; is_active: boolean };
export type Unit = { id: number; name: string; abbreviation: string };

export type InventoryBatch = {
  id: number;
  product: number;
  product_name: string;
  sku: string;
  warehouse_name: string | null;
  batch_number: string;
  expiration_date: string | null;
  quantity: string;
  received_quantity: string;
  unit_cost: string;
  is_expired: boolean;
};

export type InventoryMovement = {
  id: number;
  product_name: string;
  warehouse_name: string | null;
  movement_type: string;
  quantity: string;
  reference_number: string;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
};

export type Customer = {
  code: string;
  business_name: string;
  contact_person: string;
  customer_type: string;
  phone: string;
  email: string;
  address: string;
  credit_terms_days: number;
  credit_limit: string;
  is_active: boolean;
};

export type Allocation = {
  id: number;
  batch: number;
  batch_number: string;
  expiration_date: string | null;
  quantity: string;
  unit_cost: string;
};

export type SaleItem = {
  id: number;
  product: number;
  product_name: string;
  sku: string;
  quantity: string;
  unit_price: string;
  discount: string;
  line_total: string;
  allocations: Allocation[];
};

export type Supplier = {
  id: number;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms_days: number;
  is_active: boolean;
};

export type Warehouse = {
  id: number;
  name: string;
  code: string;
  address: string;
  is_active: boolean;
};

export type PurchaseOrderItem = {
  id: number;
  product: number;
  product_name: string;
  sku: string;
  quantity_ordered: string;
  quantity_received: string;
  quantity_outstanding: string;
  unit_cost: string;
  line_total: string;
};

export type PurchaseOrder = {
  id: number;
  po_number: string;
  supplier: number;
  supplier_name: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  notes: string;
  subtotal: string;
  total: string;
  items: PurchaseOrderItem[];
  created_at: string;
};

export type GoodsReceiptItem = {
  id: number;
  purchase_order_item: number | null;
  product: number;
  product_name: string;
  sku: string;
  batch: number | null;
  batch_number: string;
  manufacturing_date: string | null;
  expiration_date: string | null;
  quantity: string;
  unit_cost: string;
};

export type GoodsReceipt = {
  id: number;
  receipt_number: string;
  purchase_order: number | null;
  po_number: string | null;
  supplier: number;
  supplier_name: string;
  warehouse: number | null;
  warehouse_name: string | null;
  supplier_invoice_number: string;
  reference_number: string;
  received_by: string | null;
  received_by_name: string | null;
  received_date: string;
  notes: string;
  items: GoodsReceiptItem[];
  created_at: string;
};

export type SupplierPayment = {
  id: number;
  amount: string;
  method: string;
  reference_number: string;
  paid_date: string;
  created_at: string;
};

export type SupplierBill = {
  id: number;
  bill_number: string;
  supplier: number;
  supplier_name: string;
  goods_receipt: number | null;
  receipt_number: string | null;
  purchase_order: number | null;
  amount: string;
  amount_paid: string;
  balance: string;
  status: string;
  bill_date: string;
  due_date: string | null;
  notes: string;
  payments: SupplierPayment[];
  created_at: string;
};

export type PurchaseReturnItem = {
  id: number;
  batch: number;
  product_name: string;
  batch_number: string;
  quantity: string;
  reason_code: string;
  unit_cost: string;
};

export type PurchaseReturn = {
  id: number;
  return_number: string;
  supplier: number;
  supplier_name: string;
  goods_receipt: number | null;
  status: string;
  reason: string;
  items: PurchaseReturnItem[];
  created_at: string;
};

export type Sale = {
  id: number;
  invoice_number: string;
  customer: string | null;
  customer_name: string | null;
  sold_by: string | null;
  sold_by_name: string | null;
  status: string;
  payment_status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amount_paid: string;
  change_amount: string;
  items: SaleItem[];
  payments: { id: number; method: string; amount: string }[];
  created_at: string;
};

export type WebOrderItem = {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: string;
  unit_price: string;
  line_total: string;
};

export type WebOrder = {
  id: number;
  order_number: string;
  status: "PENDING" | "CONTACTED" | "CONFIRMED" | "CANCELLED";

  contact_name: string;
  business_name: string;
  customer_type:
    | "CLINIC"
    | "HOSPITAL"
    | "PHARMACY"
    | "DISTRIBUTOR"
    | "INDIVIDUAL"
    | "OTHER";

  email: string;
  phone: string;
  delivery_address: string;
  notes: string;

  supabase_user_id: string | null;
  matched_pos_customer_code: string | null;

  subtotal: string;
  total: string;

  created_at: string;
  updated_at: string;

  items: WebOrderItem[];
};