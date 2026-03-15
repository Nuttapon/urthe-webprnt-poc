import type { OrderItem, PaymentMethod } from "./pos-types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "CASH",
  qr: "QR CODE",
  credit: "CREDIT CARD",
};

function pad(left: string, right: string, width: number): string {
  const gap = width - left.length - right.length;
  return left + " ".repeat(Math.max(1, gap)) + right;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function buildReceipt(
  items: OrderItem[],
  paymentMethod: PaymentMethod
): string {
  const W = 32;
  const sep = "=".repeat(W);
  const dash = "-".repeat(W);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const lines: string[] = [
    sep,
    "        URTHE STORE",
    sep,
    "",
    `DATE: ${formatDate(new Date())}`,
    dash,
  ];

  for (const item of items) {
    lines.push(item.product.name);
    const qty = `  ${item.quantity} x ${formatNumber(item.product.price)}`;
    const subtotal = formatNumber(item.product.price * item.quantity);
    lines.push(pad(qty, subtotal, W));
  }

  lines.push(dash);
  lines.push(pad("TOTAL", formatNumber(total), W));
  lines.push(`PAYMENT: ${PAYMENT_LABELS[paymentMethod]}`);
  lines.push(sep);
  lines.push("       THANK YOU");
  lines.push("        URTHE STORE");
  lines.push(sep);

  return lines.join("\n");
}
