export interface Product {
  sku: string;
  name: string;
  price: number;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = "cash" | "qr" | "credit";
export type OrderStatus =
  | "idle"
  | "active"
  | "payment_select"
  | "processing"
  | "complete";

export interface Order {
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
}
