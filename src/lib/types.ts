export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
  image_url: string;
  active: boolean;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  total_cents: number;
  full_name: string;
  email: string;
  shipping_address: string;
  created_at: string;
  order_items: OrderItem[];
}

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;
