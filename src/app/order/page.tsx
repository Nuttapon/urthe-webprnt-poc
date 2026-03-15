"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import Link from "next/link";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "@/lib/pos-types";
import { findBySku } from "@/lib/products";
import { buildReceipt } from "@/lib/receipt";
import { printText, printAndOpenDrawer } from "@/lib/webprnt";
import { onBarcode } from "@/lib/scanner";

// ── Actions ──

type Action =
  | { type: "NEW_ORDER" }
  | { type: "ADD_ITEM"; sku: string }
  | { type: "REMOVE_ITEM"; sku: string }
  | { type: "SET_QUANTITY"; sku: string; quantity: number }
  | { type: "SELECT_PAYMENT" }
  | { type: "BACK_TO_ORDER" }
  | { type: "CONFIRM_PAYMENT"; method: PaymentMethod }
  | { type: "PAYMENT_SUCCESS" }
  | { type: "PAYMENT_ERROR" }
  | { type: "RESET" };

function calcTotal(items: OrderItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
}

const initialOrder: Order = {
  items: [],
  total: 0,
  status: "idle",
  paymentMethod: null,
};

function orderReducer(state: Order, action: Action): Order {
  switch (action.type) {
    case "NEW_ORDER":
      return { ...initialOrder, status: "active" };

    case "ADD_ITEM": {
      if (state.status !== "active") return state;
      const product = findBySku(action.sku);
      if (!product) return state;
      const existing = state.items.find((i) => i.product.sku === action.sku);
      const items = existing
        ? state.items.map((i) =>
            i.product.sku === action.sku
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...state.items, { product, quantity: 1 }];
      return { ...state, items, total: calcTotal(items) };
    }

    case "REMOVE_ITEM": {
      const items = state.items.filter((i) => i.product.sku !== action.sku);
      return { ...state, items, total: calcTotal(items) };
    }

    case "SET_QUANTITY": {
      if (action.quantity <= 0) {
        const items = state.items.filter((i) => i.product.sku !== action.sku);
        return { ...state, items, total: calcTotal(items) };
      }
      const items = state.items.map((i) =>
        i.product.sku === action.sku ? { ...i, quantity: action.quantity } : i
      );
      return { ...state, items, total: calcTotal(items) };
    }

    case "SELECT_PAYMENT":
      return state.items.length > 0
        ? { ...state, status: "payment_select" }
        : state;

    case "BACK_TO_ORDER":
      return { ...state, status: "active" };

    case "CONFIRM_PAYMENT":
      return { ...state, status: "processing", paymentMethod: action.method };

    case "PAYMENT_SUCCESS":
      return { ...state, status: "complete" };

    case "PAYMENT_ERROR":
      return { ...state, status: "active" };

    case "RESET":
      return initialOrder;

    default:
      return state;
  }
}

// ── Toast ──

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium">
      {message}
    </div>
  );
}

// ── Format helpers ──

function formatPrice(n: number): string {
  return `฿${n.toLocaleString()}`;
}

// ── Page Component ──

export default function OrderPage() {
  const [order, dispatch] = useReducer(orderReducer, initialOrder);
  const [toast, setToast] = useState<string | null>(null);
  const statusRef = useRef<OrderStatus>(order.status);
  statusRef.current = order.status;

  // Scanner — uses shared singleton connection
  useEffect(() => {
    const unsub = onBarcode((barcode) => {
      const sku = barcode.trim();
      if (statusRef.current !== "active") return;
      const product = findBySku(sku);
      if (product) {
        dispatch({ type: "ADD_ITEM", sku });
      } else {
        setToast(`ไม่พบสินค้า: ${sku}`);
      }
    });
    return unsub;
  }, []);

  const processPayment = useCallback(
    async (method: PaymentMethod) => {
      dispatch({ type: "CONFIRM_PAYMENT", method });
      const receipt = buildReceipt(order.items, method);
      try {
        if (method === "cash") {
          await printAndOpenDrawer(receipt);
        } else {
          await printText(receipt);
        }
        dispatch({ type: "PAYMENT_SUCCESS" });
      } catch {
        dispatch({ type: "PAYMENT_ERROR" });
        setToast("พิมพ์ใบเสร็จล้มเหลว กรุณาลองใหม่");
      }
    },
    [order.items]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">URTHE POS</h1>
        </div>
        <div className="flex items-center gap-3">
          {order.status === "active" && (
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="text-sm text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 active:bg-red-100"
            >
              ยกเลิก
            </button>
          )}
          <Link
            href="/"
            className="text-sm text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100"
            title="Hardware Test"
          >
            ⚙ HW
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── IDLE ── */}
        {order.status === "idle" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <button
              onClick={() => dispatch({ type: "NEW_ORDER" })}
              className="w-full max-w-sm py-6 bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg active:bg-emerald-700"
            >
              สร้างออเดอร์ใหม่
            </button>
          </div>
        )}

        {/* ── ACTIVE ── */}
        {(order.status === "active" || order.status === "payment_select") && (
          <>
            {/* Item list */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">รายการสั่งซื้อ</h2>
                <span className="text-sm text-gray-500">
                  {order.items.length} รายการ
                </span>
              </div>

              {order.items.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  สแกนสินค้าเพื่อเพิ่มรายการ
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {order.items.map((item) => (
                    <div
                      key={item.product.sku}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            SKU: {item.product.sku}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            dispatch({
                              type: "REMOVE_ITEM",
                              sku: item.product.sku,
                            })
                          }
                          className="ml-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              dispatch({
                                type: "SET_QUANTITY",
                                sku: item.product.sku,
                                quantity: item.quantity - 1,
                              })
                            }
                            className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-lg font-bold text-gray-600 active:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              dispatch({
                                type: "SET_QUANTITY",
                                sku: item.product.sku,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg text-lg font-bold text-gray-600 active:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky bottom */}
            <div className="border-t border-gray-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold">รวม</span>
                <span className="text-xl font-bold">
                  {formatPrice(order.total)}
                </span>
              </div>
              <button
                onClick={() => dispatch({ type: "SELECT_PAYMENT" })}
                disabled={order.items.length === 0}
                className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ชำระเงิน ({formatPrice(order.total)})
              </button>
            </div>

            {/* Payment bottom sheet */}
            {order.status === "payment_select" && (
              <div className="fixed inset-0 z-40 flex items-end">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => dispatch({ type: "BACK_TO_ORDER" })}
                />
                <div className="relative w-full bg-white rounded-t-2xl p-5 pb-8 z-50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold">เลือกวิธีชำระเงิน</h3>
                    <button
                      onClick={() => dispatch({ type: "BACK_TO_ORDER" })}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => processPayment("cash")}
                      className="w-full py-4 bg-amber-500 text-white font-bold text-lg rounded-xl active:bg-amber-600 flex items-center justify-center gap-2"
                    >
                      💵 เงินสด
                    </button>
                    <button
                      onClick={() => processPayment("qr")}
                      className="w-full py-4 bg-blue-500 text-white font-bold text-lg rounded-xl active:bg-blue-600 flex items-center justify-center gap-2"
                    >
                      📱 QR Code
                    </button>
                    <button
                      onClick={() => processPayment("credit")}
                      className="w-full py-4 bg-purple-500 text-white font-bold text-lg rounded-xl active:bg-purple-600 flex items-center justify-center gap-2"
                    >
                      💳 บัตรเครดิต
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PROCESSING ── */}
        {order.status === "processing" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">กำลังพิมพ์ใบเสร็จ...</p>
          </div>
        )}

        {/* ── COMPLETE ── */}
        {order.status === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">✓</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">ชำระเงินสำเร็จ</h2>
              <p className="text-3xl font-bold text-emerald-600">
                {formatPrice(order.total)}
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: "NEW_ORDER" })}
              className="w-full max-w-sm py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl active:bg-emerald-700"
            >
              ออเดอร์ใหม่
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
