// ─── Core Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  createdAt?: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  phone?: string;
  address?: string;
  currency: string;
  tagline?: string;
  enableCostTracking?: boolean;
  vatRate?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  categoryId: string;
  image?: string;
  category?: Category;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  totalCredit: number;
  createdAt?: string;
  _count?: { transactions: number };
  transactions?: Transaction[];
  creditRecords?: CreditRecord[];
  payments?: Payment[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  qty: number;
  price: number;
  product?: { name: string; sku: string; category?: { name: string } };
}

export interface Transaction {
  id: string;
  customerId?: string;
  guestName?: string;
  staffId?: string;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT';
  status: 'PAID' | 'PARTIAL' | 'CREDIT';
  note?: string;
  createdAt: string;
  customer?: { name: string; phone?: string } | null;
  staff?: { name: string } | null;
  items?: TransactionItem[];
  creditRecord?: CreditRecord | null;
}

export interface CreditRecord {
  id: string;
  customerId: string;
  transactionId: string;
  amount: number;
  paid: number;
  dueDate?: string;
  createdAt: string;
  customer?: Customer;
  transaction?: Transaction;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  creditRecordId: string;
  customerId: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
  creditRecord?: CreditRecord;
  customer?: Customer;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  qty: number;
  note?: string;
  createdAt: string;
  product?: { name: string; sku: string; category?: { name: string } };
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
}

// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  outstandingCredit: number;
  lowStockCount: number;
  salesChange?: string;
}

export interface SalesChartPoint {
  day: string;
  revenue: number;
}

export interface PaymentBreakdown {
  method: string;
  count: number;
  total: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InventoryMovementResponse {
  movements: StockMovement[];
  total: number;
  page: number;
}

export interface ReportSalesPoint {
  date: string;
  day: string;
  revenue: number;
  transactions: number;
}

export interface CashflowReport {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  outstandingCredit: number;
  grossMargin: number;
}

export interface BestSeller {
  categoryId: string;
  name: string;
  color: string;
  totalQty: number;
  totalRevenue: number;
}

export interface StaffReport {
  id: string;
  name: string;
  role: string;
  transactions: number;
  totalSales: number;
}
