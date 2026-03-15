import type { Product } from "./pos-types";

export const products: Product[] = [
  { sku: "SWWHSP01825", name: "INVERT SWEATSHIRT (SW) WHITE", price: 890 },
  { sku: "SWBKSP01825", name: "INVERT SWEATSHIRT (SW) BLACK", price: 890 },
  { sku: "TSWHRG01490", name: "MINIMAL TEE (RG) WHITE", price: 490 },
  { sku: "TSBKRG01490", name: "MINIMAL TEE (RG) BLACK", price: 490 },
  { sku: "BGEBFF01290", name: "NYLON CROSS BODY BAG BLACK", price: 499 },
  { sku: "BGEWFF01290", name: "NYLON CROSS BODY BAG WHITE", price: 499 },
  { sku: "CPBKUT01350", name: "URTHE CAP BLACK", price: 350 },
  { sku: "CPWHUT01350", name: "URTHE CAP WHITE", price: 350 },
  { sku: "JKBKOV01990", name: "OVERSIZED JACKET BLACK", price: 1990 },
  { sku: "PTBKJG01690", name: "JOGGER PANTS BLACK", price: 690 },
];

export function findBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}
