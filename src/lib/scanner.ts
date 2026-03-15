import { startMonitoring, type MonitoringCallbacks } from "./webprnt";

// ── Types ──

type BarcodeCallback = (barcode: string) => void;

export interface StatusCallbacks {
  onPrinterOnline?: () => void;
  onPrinterOffline?: () => void;
  onCashDrawerOpen?: () => void;
  onCashDrawerClose?: () => void;
  onAccessoryConnect?: () => void;
  onAccessoryDisconnect?: () => void;
}

// ── Module-level singleton state ──

const barcodeListeners = new Set<BarcodeCallback>();
const statusListeners = new Set<StatusCallbacks>();
let connected = false;

function ensureConnected(): void {
  if (connected) return;
  if (typeof window === "undefined" || !window.StarWebPrintExtManager) return;

  connected = true;

  const callbacks: MonitoringCallbacks = {
    onBarcodeData: (barcode) => {
      barcodeListeners.forEach((cb) => cb(barcode));
    },
    onPrinterOnline: () => {
      statusListeners.forEach((cb) => cb.onPrinterOnline?.());
    },
    onPrinterOffline: () => {
      statusListeners.forEach((cb) => cb.onPrinterOffline?.());
    },
    onCashDrawerOpen: () => {
      statusListeners.forEach((cb) => cb.onCashDrawerOpen?.());
    },
    onCashDrawerClose: () => {
      statusListeners.forEach((cb) => cb.onCashDrawerClose?.());
    },
    onAccessoryConnect: () => {
      statusListeners.forEach((cb) => cb.onAccessoryConnect?.());
    },
    onAccessoryDisconnect: () => {
      statusListeners.forEach((cb) => cb.onAccessoryDisconnect?.());
    },
  };

  // Never disconnect — connection persists for app lifetime
  startMonitoring(callbacks);
}

// ── Public API ──

export function onBarcode(callback: BarcodeCallback): () => void {
  ensureConnected();
  barcodeListeners.add(callback);
  return () => {
    barcodeListeners.delete(callback);
  };
}

export function onStatus(callbacks: StatusCallbacks): () => void {
  ensureConnected();
  statusListeners.add(callbacks);
  return () => {
    statusListeners.delete(callbacks);
  };
}
