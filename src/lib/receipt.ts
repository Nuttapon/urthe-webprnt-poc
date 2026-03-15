import type { OrderItem, PaymentMethod } from "./pos-types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "เงินสด",
  qr: "QR Code",
  credit: "บัตรเครดิต",
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

export function buildReceipt(
  items: OrderItem[],
  paymentMethod: PaymentMethod
): string {
  const W = 32;
  const sep = "=".repeat(W);
  const dash = "-".repeat(W);
  const now = new Date();
  const date = now.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const lines: string[] = [
    sep,
    "        URTHE STORE",
    sep,
    "",
    `วันที่: ${date} ${time}`,
    dash,
  ];

  for (const item of items) {
    lines.push(item.product.name);
    const qty = `  ${item.quantity} x ${formatNumber(item.product.price)}`;
    const subtotal = formatNumber(item.product.price * item.quantity);
    lines.push(pad(qty, subtotal, W));
  }

  lines.push(dash);
  lines.push(pad("รวมทั้งสิ้น", formatNumber(total), W));
  lines.push(`ชำระด้วย: ${PAYMENT_LABELS[paymentMethod]}`);
  lines.push(sep);
  lines.push("     ขอบคุณที่ใช้บริการ");
  lines.push("        URTHE STORE");
  lines.push(sep);

  return lines.join("\n");
}
