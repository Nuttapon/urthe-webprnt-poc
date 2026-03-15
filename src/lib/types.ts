export interface TraderOptions {
  url: string;
  checkedblock?: boolean;
  timeout?: number;
}

export interface TraderSendMessageOptions {
  request: string;
}

export interface TraderResponse {
  traderSuccess: string;
  traderCode: string;
  traderStatus: string;
  status: number;
  responseText: string;
}

export interface StarWebPrintTrader {
  new (options: TraderOptions): StarWebPrintTrader;
  sendMessage(options: TraderSendMessageOptions): void;
  onReceive: ((response: TraderResponse) => void) | null;
  onError: ((response: TraderResponse) => void) | null;
  isCoverOpen(status: number): boolean;
  isOffLine(status: number): boolean;
  isCompulsionSwitchClose(status: number): boolean;
  isEtbCommandExecute(status: number): boolean;
  isHighTemperatureStop(status: number): boolean;
  isNonRecoverableError(status: number): boolean;
  isAutoCutterError(status: number): boolean;
  isBlackMarkError(status: number): boolean;
  isPaperEnd(status: number): boolean;
  isPaperNearEnd(status: number): boolean;
}

export interface BuilderOptions {
  request?: string;
}

export interface StarWebPrintBuilder {
  new (options?: BuilderOptions): StarWebPrintBuilder;
  createInitializationElement(options?: {
    reset?: boolean;
    print?: boolean;
  }): string;
  createTextElement(options: {
    data?: string;
    characterspace?: number;
    emphasis?: boolean;
    width?: number;
    height?: number;
    codepage?: string;
    international?: string;
  }): string;
  createAlignmentElement(options: {
    position: "left" | "center" | "right";
  }): string;
  createPeripheralElement(options: {
    channel: number;
    on: number;
    off: number;
  }): string;
  createCutPaperElement(options: {
    feed: boolean;
    type?: "full" | "partial";
  }): string;
  createRawDataElement(options: { data: string }): string;
  createCodePageElement(options: { page: string }): string;
}

export interface ExtManagerOptions {
  url: string;
  timeout?: number;
}

export interface StarWebPrintExtManager {
  new (options: ExtManagerOptions): StarWebPrintExtManager;
  connect(): void;
  disconnect(): void;
  onBarcodeDataReceive: ((data: { data: string }) => void) | null;
  onPrinterOnline: (() => void) | null;
  onPrinterOffline: (() => void) | null;
  onPrinterImpossible: (() => void) | null;
  onPrinterPaperEmpty: (() => void) | null;
  onPrinterPaperNearEmpty: (() => void) | null;
  onPrinterCoverOpen: (() => void) | null;
  onCashDrawerOpen: (() => void) | null;
  onCashDrawerClose: (() => void) | null;
  onAccessoryConnectSuccess: (() => void) | null;
  onAccessoryConnectFailure: (() => void) | null;
  onAccessoryDisconnect: (() => void) | null;
}

declare global {
  interface Window {
    StarWebPrintTrader: {
      new (options: TraderOptions): StarWebPrintTrader;
    };
    StarWebPrintBuilder: {
      new (options?: BuilderOptions): StarWebPrintBuilder;
    };
    StarWebPrintExtManager: {
      new (options: ExtManagerOptions): StarWebPrintExtManager;
    };
  }
}
