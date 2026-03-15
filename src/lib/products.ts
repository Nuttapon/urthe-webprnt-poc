import type { Product } from "./pos-types";

export const products: Product[] = [
  { sku: "SWWHSP01825", name: "INVERT SWEATSHIRT (SW) ขาว", price: 890 },
  { sku: "SWBKSP01825", name: "INVERT SWEATSHIRT (SW) ดำ", price: 890 },
  { sku: "TSWHRG01490", name: "MINIMAL TEE (RG) ขาว", price: 490 },
  { sku: "TSBKRG01490", name: "MINIMAL TEE (RG) ดำ", price: 490 },
  { sku: "BGEBFF01290", name: "NYLON CROSS BODY BAG ดำ", price: 499 },
  { sku: "BGEWFF01290", name: "NYLON CROSS BODY BAG ขาว", price: 499 },
  { sku: "CPBKUT01350", name: "URTHE CAP ดำ", price: 350 },
  { sku: "CPWHUT01350", name: "URTHE CAP ขาว", price: 350 },
  { sku: "JKBKOV01990", name: "OVERSIZED JACKET ดำ", price: 1990 },
  { sku: "PTBKJG01690", name: "JOGGER PANTS ดำ", price: 690 },
];

export function findBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}
