import type { Product } from "./pos-types";

export const products: Product[] = [
  { sku: "SWWHSP01825", name: "INVERT SWEATSHIRT (SW) WHITE", price: 890 },
  { sku: "BGEBFF01290", name: "NYLON CROSS BODY 2.0 (BG) BLACK", price: 499 },
  { sku: "TSEBOV01583", name: "PROPAGANDA TEE (TS) BLACK", price: 399 },
  { sku: "TSWFF01056", name: "PLAMO (TS) WHITE", price: 299 },
  { sku: "TSWHFF01372", name: "CODE CHROME (TS) WHITE", price: 299 },
  { sku: "POCROV01753", name: "TTS VELOCITY POLO (PO) CREAM", price: 299 },
  { sku: "TSEFF00080", name: "YLG (TS) BLACK", price: 299 },
  { sku: "TSWFF00076", name: "SURFING CAMP 2.0 (TS) WHITE", price: 299 },
  { sku: "TSFOV00948", name: "LIFE IS A RACE (TS) BLACK/CREAM", price: 299 },
  { sku: "POWOV01217", name: "BS POLO CLUB (PO) WHITE", price: 299 },
];

export function findBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}
