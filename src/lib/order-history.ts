import type { OrderItem, PaymentMethod } from "@/lib/pos-types";

export interface CompletedOrder {
  id: string;
  items: OrderItem[];
  total: number;
  paymentMethod: PaymentMethod;
  completedAt: Date;
}

let orders: CompletedOrder[] = [];
let snapshot: CompletedOrder[] = orders;
let listeners: Set<() => void> = new Set();

function notify() {
  snapshot = [...orders];
  listeners.forEach((cb) => cb());
}

export function addOrder(order: Omit<CompletedOrder, "id" | "completedAt">): void {
  orders.push({
    ...order,
    id: Date.now().toString(36),
    completedAt: new Date(),
  });
  notify();
}

export function getOrders(): CompletedOrder[] {
  return snapshot;
}

export function onOrdersChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
