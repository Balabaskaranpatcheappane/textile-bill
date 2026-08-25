export interface Product {
  id: number;
  name: string;
  hsn?: string | null;
  unit: string;
  price: number;
  stock: number;
  gst: number;
  barcode?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
}

export interface InvoiceItem {
  id?: number;
  product_id?: number | null;
  name: string;
  hsn?: string | null;
  unit?: string | null;
  qty: number;
  price: number;
  gst: number;
  amount?: number;
}

export interface Invoice {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name: string;
  customer_gstin?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  invoice_date: string;
  subtotal: number;
  gst_total: number;
  discount: number;
  grand_total: number;
  payment_mode: string;
  notes?: string | null;
  items?: InvoiceItem[];
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'staff';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export type PaperSize = '58mm' | '80mm' | 'a4';

export interface ShopSettings {
  shop_name: string;
  address: string;
  phone: string;
  gstin: string;
  email: string;
  default_paper_size: PaperSize;
  footer_text: string;
  invoice_prefix: string;
  has_logo: boolean;
  logo_mime?: string | null;
  updated_at?: string;
}

export interface DashboardSummary {
  today: string;
  invoiceCount: number;
  totalSales: number;
  lowStock: Array<Pick<Product, 'id' | 'name' | 'stock' | 'unit'>>;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface ReportBucket {
  bucket: string;
  sales: number;
  gst: number;
  invoices: number;
}

export interface SalesReport {
  period: ReportPeriod;
  from: string;
  to: string;
  buckets: ReportBucket[];
  totals: { sales: number; gst: number; invoices: number; avg_bill: number };
  topProducts: Array<{ name: string; qty: number; amount: number }>;
}

export interface DashboardTrend {
  from: string;
  to: string;
  buckets: Array<{ bucket: string; sales: number; invoices: number }>;
}
