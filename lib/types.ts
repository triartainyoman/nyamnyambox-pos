export type UserRole = "MASTER_ADMIN" | "OWNER" | "DEVELOPER" | "EMPLOYEE";

export type OrderChannel =
  | "DINE_IN"
  | "TAKEAWAY"
  | "GRABFOOD"
  | "SHOPEEFOOD"
  | "WHATSAPP";

export type PaymentMethod = "CASH" | "TRANSFER" | "QRIS" | "E_WALLET";

export type PaymentStatus = "LUNAS" | "BELUM_LUNAS";

export interface Profile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_transaction: number;
  notes: string | null;
  created_at: string;
  product?: Pick<Product, "name" | "image_url"> | null;
}

export interface Order {
  id: string;
  receipt_number: string;
  cashier_id: string | null;
  channel: OrderChannel;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  is_edited: boolean;
  customer_phone: string | null;
  created_at: string;
  cashier?: { name: string } | null;
  order_items?: OrderItem[];
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  notes: string;
}

export interface CreateOrderInput {
  channel: OrderChannel;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_phone?: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string | null;
  }>;
}

export interface UpdateOrderInput {
  order_id: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_phone?: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string | null;
  }>;
}

export interface ProductInput {
  name: string;
  price: number;
  image_url?: string | null;
  is_active?: boolean;
}

export interface DashboardSummary {
  today: {
    revenue: number;
    orders: number;
    paid_orders: number;
    unpaid_orders: number;
    aov: number;
  };
  monthly: Array<{ month: string; label: string; revenue: number; orders: number }>;
  channels: Array<{ channel: OrderChannel; revenue: number; orders: number }>;
  top_products: Array<{ product_id: string; name: string; quantity: number; revenue: number }>;
}

export interface DashboardData extends DashboardSummary {
  recent_orders: Order[];
  monthRevenue: number;
  monthOrders: number;
}

export type ActionResult = { error?: string } | undefined;
