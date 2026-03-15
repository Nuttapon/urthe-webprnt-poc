import type {
  StarWebPrintTrader,
  StarWebPrintBuilder,
  TraderResponse,
} from "./types";

const DEFAULT_PRINT_URL =
  "http://localhost:8001/StarWebPRNT/SendMessage";
const DEFAULT_EXT_URL =
  "http://localhost:8001/StarWebPRNT/SendExtMessage";

function createTrader(url?: string): StarWebPrintTrader {
  return new window.StarWebPrintTrader({
    url: url || DEFAULT_PRINT_URL,
    checkedblock: true,
    timeout: 10000,
  });
}

function createBuilder(): StarWebPrintBuilder {
  return new window.StarWebPrintBuilder();
}

function sendRequest(
  trader: StarWebPrintTrader,
  request: string
): Promise<TraderResponse> {
  return new Promise((resolve, reject) => {
    trader.onReceive = (response) => resolve(response);
    trader.onError = (response) => reject(response);
    trader.sendMessage({ request });
  });
}

export async function openCashDrawer(url?: string): Promise<TraderResponse> {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });

  return sendRequest(trader, request);
}

export async function printText(
  text: string,
  url?: string
): Promise<TraderResponse> {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createCodePageElement({ page: "cp874" });
  request += builder.createAlignmentElement({ position: "center" });
  request += builder.createTextElement({
    data: text + "\n",
    width: 1,
    height: 1,
  });
  request += builder.createCutPaperElement({ feed: true, type: "partial" });

  return sendRequest(trader, request);
}

export async function printAndOpenDrawer(
  text: string,
  url?: string
): Promise<TraderResponse> {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createCodePageElement({ page: "cp874" });
  request += builder.createAlignmentElement({ position: "center" });
  request += builder.createTextElement({
    data: text + "\n",
    width: 1,
    height: 1,
  });
  request += builder.createCutPaperElement({ feed: true, type: "partial" });
  request += builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });

  return sendRequest(trader, request);
}

export interface MonitoringCallbacks {
  onBarcodeData?: (barcode: string) => void;
  onPrinterOnline?: () => void;
  onPrinterOffline?: () => void;
  onCashDrawerOpen?: () => void;
  onCashDrawerClose?: () => void;
  onAccessoryConnect?: () => void;
  onAccessoryDisconnect?: () => void;
}

export function startMonitoring(
  callbacks: MonitoringCallbacks,
  url?: string
): () => void {
  const manager = new window.StarWebPrintExtManager({
    url: url || DEFAULT_EXT_URL,
    timeout: 10000,
  });

  manager.onBarcodeDataReceive = (data) => {
    try {
      const decoded = atob(data.data);
      callbacks.onBarcodeData?.(decoded);
    } catch {
      callbacks.onBarcodeData?.(data.data);
    }
  };

  manager.onPrinterOnline = () => callbacks.onPrinterOnline?.();
  manager.onPrinterOffline = () => callbacks.onPrinterOffline?.();
  manager.onCashDrawerOpen = () => callbacks.onCashDrawerOpen?.();
  manager.onCashDrawerClose = () => callbacks.onCashDrawerClose?.();
  manager.onAccessoryConnectSuccess = () => callbacks.onAccessoryConnect?.();
  manager.onAccessoryConnectFailure = () => callbacks.onAccessoryDisconnect?.();
  manager.onAccessoryDisconnect = () => callbacks.onAccessoryDisconnect?.();

  manager.connect();

  return () => manager.disconnect();
}
