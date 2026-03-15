"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { getOrders, onOrdersChange } from "@/lib/order-history";
import type { CompletedOrder } from "@/lib/order-history";
import type { PaymentMethod } from "@/lib/pos-types";

function useOrders(): CompletedOrder[] {
  return useSyncExternalStore(onOrdersChange, getOrders, getOrders);
}

const paymentLabel: Record<PaymentMethod, string> = {
  cash: "💵 เงินสด",
  qr: "📱 QR Code",
  credit: "💳 บัตรเครดิต",
};

function formatPrice(n: number): string {
  return `฿${n.toLocaleString()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderHistoryPage() {
  const orders = useOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...orders].reverse();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold">ประวัติออเดอร์</h1>
        <Link
          href="/order"
          className="text-sm text-emerald-600 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-50"
        >
          กลับหน้า POS
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            ยังไม่มีประวัติออเดอร์
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((order) => {
              const expanded = expandedId === order.id;
              const itemCount = order.items.reduce(
                (sum, i) => sum + i.quantity,
                0
              );
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedId(expanded ? null : order.id)
                    }
                    className="w-full px-4 py-3 flex items-center justify-between text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {formatTime(order.completedAt)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {itemCount} ชิ้น · {paymentLabel[order.paymentMethod]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {formatPrice(order.total)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {expanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-100 px-4 py-3">
                      {order.items.map((item) => (
                        <div
                          key={item.product.sku}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div>
                            <span className="text-gray-900">
                              {item.product.name}
                            </span>
                            <span className="text-gray-400 text-sm ml-2">
                              x{item.quantity}
                            </span>
                          </div>
                          <span className="text-gray-700">
                            {formatPrice(
                              item.product.price * item.quantity
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
