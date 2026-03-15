# Star mPOP + WebPRNT Browser — Integration Guide

Comprehensive guide for integrating Star mPOP printer (receipt printing, cash drawer, barcode scanner) into a web application using **Star webPRNT Browser** on iPad.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Why WebPRNT Browser (not PassPRNT)](#why-webprnt-browser-not-passprnt)
- [Hardware Setup](#hardware-setup)
- [SDK Overview](#sdk-overview)
  - [Three SDK Files](#three-sdk-files)
  - [Three Core Classes](#three-core-classes)
- [SDK Gotchas & Pitfalls](#sdk-gotchas--pitfalls)
- [Integration Steps](#integration-steps)
  - [1. Host the SDK Files](#1-host-the-sdk-files)
  - [2. Load Scripts Before App Code](#2-load-scripts-before-app-code)
  - [3. TypeScript Declarations](#3-typescript-declarations)
  - [4. Wrapper Functions](#4-wrapper-functions)
- [API Reference](#api-reference)
  - [Printing Text](#printing-text)
  - [Opening Cash Drawer](#opening-cash-drawer)
  - [Print + Open Drawer (Combined)](#print--open-drawer-combined)
  - [Barcode Scanner Monitoring](#barcode-scanner-monitoring)
  - [Printer & Device Status Monitoring](#printer--device-status-monitoring)
- [URL Configuration](#url-configuration)
- [How the SDK Communicates Inside webPRNT Browser](#how-the-sdk-communicates-inside-webprnt-browser)
- [Response Handling](#response-handling)
- [Builder Element Reference](#builder-element-reference)
- [ExtManager Event Reference](#extmanager-event-reference)
- [Next.js Static Export Notes](#nextjs-static-export-notes)
- [Porting Checklist](#porting-checklist)
- [File Structure (POC Reference)](#file-structure-poc-reference)
- [Complete Working Code](#complete-working-code)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  iPad                                               │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Star webPRNT Browser App                     │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Your Web App (loaded inside browser)   │  │  │
│  │  │                                         │  │  │
│  │  │  StarWebPrintBuilder  → builds XML      │  │  │
│  │  │  StarWebPrintTrader   → sends to printer│  │  │
│  │  │  StarWebPrintExtManager → listens events│  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │         │                        ▲            │  │
│  │         │ webkit.messageHandlers │ callbacks   │  │
│  │         ▼                        │            │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Native Bridge (localhost:8001)         │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│         │ Bluetooth                                  │
│         ▼                                            │
│  ┌──────────────┐                                    │
│  │  Star mPOP   │                                    │
│  │  ┌────────┐  │                                    │
│  │  │Printer │  │                                    │
│  │  │Drawer  │  │                                    │
│  │  │USB port│──── USB Barcode Scanner               │
│  │  └────────┘  │                                    │
│  └──────────────┘                                    │
└─────────────────────────────────────────────────────┘
```

**Flow:**
1. Your web app builds XML commands using `StarWebPrintBuilder`
2. `StarWebPrintTrader` sends them to `localhost:8001` (the native bridge inside webPRNT Browser)
3. The native bridge forwards commands to the mPOP via Bluetooth
4. `StarWebPrintExtManager` polls the bridge for events (barcode scans, status changes)

---

## Why WebPRNT Browser (not PassPRNT)

| Feature | PassPRNT | webPRNT Browser |
|---------|----------|-----------------|
| Print receipts | Yes | Yes |
| Open cash drawer | Yes | Yes |
| **Receive barcode data** | **No** | **Yes** |
| Printer status events | No | Yes |
| Cash drawer status | No | Yes |
| Communication method | URL scheme (one-way) | JS SDK (two-way) |

**Key difference:** PassPRNT is fire-and-forget (you send a URL scheme, no response). webPRNT Browser runs your web app inside its own browser with a native bridge, enabling **two-way communication** — you can receive barcode scan data, printer status, and drawer state.

---

## Hardware Setup

- **Star mPOP** — receipt printer + cash drawer combo, connects to iPad via Bluetooth
- **USB Barcode Scanner** — plugs into the USB-A port on the back of the mPOP
- **iPad** — runs Star webPRNT Browser app from the App Store

The mPOP must be paired with the iPad via Bluetooth and configured in the Star webPRNT Browser app settings before your web app can communicate with it.

---

## SDK Overview

### Three SDK Files

Download from the official Star Micronics GitHub repo:

```bash
# From: https://github.com/star-micronics/starwebprnt-sdk
curl -o StarWebPrintTrader.js \
  https://raw.githubusercontent.com/star-micronics/starwebprnt-sdk/master/Sample/js/StarWebPrintTrader.js

curl -o StarWebPrintBuilder.js \
  https://raw.githubusercontent.com/star-micronics/starwebprnt-sdk/master/Sample/js/StarWebPrintBuilder.js

curl -o StarWebPrintExtManager.js \
  https://raw.githubusercontent.com/star-micronics/starwebprnt-sdk/master/Sample/js/StarWebPrintExtManager.js
```

SDK versions at time of writing: Builder v1.3.0, Trader v1.2.0, ExtManager v1.2.0.

### Three Core Classes

| Class | Purpose | Protocol |
|-------|---------|----------|
| `StarWebPrintBuilder` | Builds XML command strings | Pure logic, no I/O |
| `StarWebPrintTrader` | Sends commands to the printer | HTTP POST or webkit messageHandler |
| `StarWebPrintExtManager` | Monitors device events (barcode, status) | Polling via Trader internally |

---

## SDK Gotchas & Pitfalls

### 1. Builder methods return strings, they do NOT chain

This is the **#1 gotcha**. The Builder looks like it should chain (jQuery-style) but it doesn't. Each `create*Element()` method returns an XML string fragment. You must concatenate them yourself.

```typescript
// WRONG — builder.request does not exist, returns undefined
const builder = new StarWebPrintBuilder();
builder.createInitializationElement();
builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });
trader.sendMessage({ request: builder.request }); // sends undefined!
```

```typescript
// CORRECT — concatenate the return values
const builder = new StarWebPrintBuilder();
let request = "";
request += builder.createInitializationElement();
request += builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });
trader.sendMessage({ request }); // sends actual XML
```

The SDK will still return "success" even with an empty/undefined request — the printer just won't do anything. This makes the bug very hard to catch.

### 2. Barcode data comes Base64-encoded

`ExtManager.onBarcodeDataReceive` provides `{ data: string }` where `data` is **Base64-encoded**. You must decode it:

```typescript
manager.onBarcodeDataReceive = (data) => {
  const barcode = atob(data.data); // decode Base64 → actual barcode string
};
```

### 3. Trader auto-detects webPRNT Browser environment

Looking at the Trader source code (line 14 of the SDK), when the URL matches `localhost:8001` AND the user agent contains `webPRNTSupportMessageHandler`, it bypasses XMLHttpRequest and uses `webkit.messageHandlers.sendMessageHandler.postMessage()` instead. This is automatic — you don't need to handle it.

### 4. ExtManager uses Trader internally

ExtManager creates its own `StarWebPrintTrader` instance internally for polling. This means `StarWebPrintTrader.js` must be loaded before `StarWebPrintExtManager.js`.

### 5. Boolean values in Builder are strings

The SDK validates boolean parameters as the strings `"true"` / `"false"`, not actual booleans. However, when you pass a JS boolean, the SDK's regex `/^(false|true)$/` tests `String(value)`, so JS booleans work fine in practice.

---

## Integration Steps

### 1. Host the SDK Files

Place the 3 JS files somewhere accessible by your web app. For Next.js, use the `public/` directory:

```
public/
  star-sdk/
    StarWebPrintTrader.js
    StarWebPrintBuilder.js
    StarWebPrintExtManager.js
```

### 2. Load Scripts Before App Code

The SDK files create global constructors (`window.StarWebPrintTrader`, etc.) and must be loaded **before** any application code tries to use them.

**Next.js (App Router):**

```tsx
// src/app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <Script src="/star-sdk/StarWebPrintTrader.js" strategy="beforeInteractive" />
        <Script src="/star-sdk/StarWebPrintBuilder.js" strategy="beforeInteractive" />
        <Script src="/star-sdk/StarWebPrintExtManager.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Plain HTML:**

```html
<script src="/star-sdk/StarWebPrintTrader.js"></script>
<script src="/star-sdk/StarWebPrintBuilder.js"></script>
<script src="/star-sdk/StarWebPrintExtManager.js"></script>
```

**Load order matters:** Trader must come before ExtManager (ExtManager instantiates Trader internally).

### 3. TypeScript Declarations

The SDK is vanilla JS with no types. You need to declare the global types yourself:

```typescript
// src/lib/star-webprnt.d.ts (or types.ts)

export interface TraderOptions {
  url: string;
  checkedblock?: boolean;  // wait for printing to complete before responding
  timeout?: number;        // milliseconds, default 90000
}

export interface TraderResponse {
  traderSuccess: string;   // "true" or "false"
  traderCode: string;      // status code
  traderStatus: string;    // hex-encoded printer status bytes
  status: number;          // HTTP status code
  responseText: string;    // raw response XML
}

export interface StarWebPrintTrader {
  new (options: TraderOptions): StarWebPrintTrader;
  sendMessage(options: { request: string }): void;
  onReceive: ((response: TraderResponse) => void) | null;
  onError: ((response: TraderResponse) => void) | null;

  // Status check helpers (pass the response object)
  isCoverOpen(response: TraderResponse): boolean;
  isOffLine(response: TraderResponse): boolean;
  isCompulsionSwitchClose(response: TraderResponse): boolean;
  isEtbCommandExecute(response: TraderResponse): boolean;
  isHighTemperatureStop(response: TraderResponse): boolean;
  isNonRecoverableError(response: TraderResponse): boolean;
  isAutoCutterError(response: TraderResponse): boolean;
  isBlackMarkError(response: TraderResponse): boolean;
  isPaperEnd(response: TraderResponse): boolean;
  isPaperNearEnd(response: TraderResponse): boolean;
}

export interface StarWebPrintBuilder {
  new (): StarWebPrintBuilder;

  // Every method returns an XML string — concatenate them!
  createInitializationElement(options?: { reset?: boolean; print?: boolean }): string;
  createTextElement(options: {
    data?: string;
    emphasis?: boolean;       // bold
    underline?: boolean;
    width?: number;           // 1–6, character width multiplier
    height?: number;          // 1–6, character height multiplier
    characterspace?: number;  // 0–7
    font?: "font_a" | "font_b";
    codepage?: string;        // e.g. "utf8", "cp874" (Thai)
    international?: string;   // e.g. "usa", "japan"
    invert?: boolean;         // white on black
    linespace?: "24" | "32";
  }): string;
  createAlignmentElement(options: { position: "left" | "center" | "right" }): string;
  createPeripheralElement(options: {
    channel: number;  // 1 or 2 (mPOP uses channel 1)
    on: number;       // pulse on duration in ms (1–65535)
    off: number;      // pulse off duration in ms (1–65535)
  }): string;
  createCutPaperElement(options: { feed: boolean; type?: "full" | "partial" }): string;
  createBarcodeElement(options: {
    symbology: "UPCE" | "UPCA" | "JAN8" | "JAN13" | "Code39" | "ITF" | "Code128" | "Code93" | "NW7";
    data: string;
    width?: string;   // "width2"–"width6" or "width_mode1"–"width_mode15"
    hri?: boolean;    // print human-readable text below barcode
    height?: number;  // 1–255 dots
  }): string;
  createQrCodeElement(options: {
    data: string;
    model?: "model1" | "model2";
    level?: "level_l" | "level_m" | "level_q" | "level_h";
    cell?: number;    // 1–12, module size
  }): string;
  createFeedElement(options: { line?: number; unit?: number }): string;
  createLogoElement(options: { number?: number; width?: "single" | "double"; height?: "single" | "double" }): string;
  createRuledLineElement(options: { thickness?: string; width?: number }): string;
  createRawDataElement(options: { data: string }): string;
  createSoundElement(options: { channel?: number; repeat?: number }): string;
  createBitImageElement(options: {
    context: CanvasRenderingContext2D;
    x?: number; y?: number;
    width: number; height: number;
  }): string;
}

export interface StarWebPrintExtManager {
  new (options: { url: string; pollingTimeout?: number; pollingInterval?: number }): StarWebPrintExtManager;
  connect(): boolean;
  disconnect(): boolean;

  // Printer events
  onPrinterOnline: (() => void) | null;
  onPrinterOffline: (() => void) | null;
  onPrinterImpossible: (() => void) | null;
  onPrinterPaperReady: (() => void) | null;
  onPrinterPaperNearEmpty: (() => void) | null;
  onPrinterPaperEmpty: (() => void) | null;
  onPrinterCoverOpen: (() => void) | null;
  onPrinterCoverClose: (() => void) | null;

  // Cash drawer events
  onCashDrawerOpen: (() => void) | null;
  onCashDrawerClose: (() => void) | null;

  // Barcode scanner events
  onBarcodeReaderConnect: (() => void) | null;
  onBarcodeReaderDisconnect: (() => void) | null;
  onBarcodeReaderImpossible: (() => void) | null;
  onBarcodeDataReceive: ((data: { data: string }) => void) | null;  // data is Base64!

  // Accessory (scanner connected via USB to mPOP)
  onAccessoryConnectSuccess: (() => void) | null;
  onAccessoryConnectFailure: (() => void) | null;
  onAccessoryDisconnect: (() => void) | null;

  // Display (customer-facing display, if connected)
  onDisplayConnect: (() => void) | null;
  onDisplayDisconnect: (() => void) | null;
  onDisplayImpossible: (() => void) | null;

  // Other
  onStatusUpdate: ((data: { status: string }) => void) | null;
  onWrite: (() => void) | null;
  onReceive: ((response: unknown) => void) | null;
  onError: ((response: unknown) => void) | null;
}

// Augment the Window interface
declare global {
  interface Window {
    StarWebPrintTrader: { new (options: TraderOptions): StarWebPrintTrader };
    StarWebPrintBuilder: { new (): StarWebPrintBuilder };
    StarWebPrintExtManager: { new (options: { url: string; pollingTimeout?: number; pollingInterval?: number }): StarWebPrintExtManager };
  }
}
```

### 4. Wrapper Functions

Here is the complete, tested wrapper (copy-paste ready):

```typescript
// src/lib/webprnt.ts

const DEFAULT_PRINT_URL = "http://localhost:8001/StarWebPRNT/SendMessage";
const DEFAULT_EXT_URL   = "http://localhost:8001/StarWebPRNT/SendExtMessage";

function createTrader(url?: string) {
  return new window.StarWebPrintTrader({
    url: url || DEFAULT_PRINT_URL,
    checkedblock: true,
    timeout: 10000,
  });
}

function createBuilder() {
  return new window.StarWebPrintBuilder();
}

function sendRequest(trader: StarWebPrintTrader, request: string): Promise<TraderResponse> {
  return new Promise((resolve, reject) => {
    trader.onReceive = (response) => resolve(response);
    trader.onError = (response) => reject(response);
    trader.sendMessage({ request });
  });
}

// ── Public API ──────────────────────────────────────

export async function openCashDrawer(url?: string) {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });

  return sendRequest(trader, request);
}

export async function printText(text: string, url?: string) {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createAlignmentElement({ position: "center" });
  request += builder.createTextElement({ data: text + "\n", width: 1, height: 1 });
  request += builder.createCutPaperElement({ feed: true, type: "partial" });

  return sendRequest(trader, request);
}

export async function printAndOpenDrawer(text: string, url?: string) {
  const trader = createTrader(url);
  const builder = createBuilder();

  let request = "";
  request += builder.createInitializationElement();
  request += builder.createAlignmentElement({ position: "center" });
  request += builder.createTextElement({ data: text + "\n", width: 1, height: 1 });
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

/** Returns a disconnect function. Call it on component unmount. */
export function startMonitoring(callbacks: MonitoringCallbacks, url?: string): () => void {
  const manager = new window.StarWebPrintExtManager({
    url: url || DEFAULT_EXT_URL,
    pollingTimeout: 30000,
  });

  manager.onBarcodeDataReceive = (data) => {
    try {
      const decoded = atob(data.data); // Base64 → string
      callbacks.onBarcodeData?.(decoded);
    } catch {
      callbacks.onBarcodeData?.(data.data); // fallback: use raw
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
```

---

## API Reference

### Printing Text

```typescript
import { printText } from "@/lib/webprnt";

// Simple text
await printText("Hello World");

// Multi-line receipt
const receipt = [
  "================================",
  "        STORE NAME",
  "================================",
  "Item 1              100.00",
  "Item 2              250.00",
  "--------------------------------",
  "Total               350.00",
].join("\n");
await printText(receipt);
```

The XML generated looks like:
```xml
<initialization/>
<alignment position="center"/>
<text width="1" height="1">Hello World\x0a</text>
<cutpaper feed="true" type="partial"/>
```

### Opening Cash Drawer

```typescript
import { openCashDrawer } from "@/lib/webprnt";

await openCashDrawer();
```

The XML generated:
```xml
<initialization/>
<peripheral channel="1" on="200" off="200"/>
```

- `channel: 1` — mPOP has one drawer, always channel 1
- `on: 200` — solenoid pulse ON duration (ms)
- `off: 200` — solenoid pulse OFF duration (ms)

### Print + Open Drawer (Combined)

```typescript
import { printAndOpenDrawer } from "@/lib/webprnt";

await printAndOpenDrawer(receiptText);
```

Sends both print and peripheral commands in a single request. The drawer opens after printing completes.

### Barcode Scanner Monitoring

```typescript
import { startMonitoring } from "@/lib/webprnt";

// In a React component:
useEffect(() => {
  if (!window.StarWebPrintExtManager) return;

  const disconnect = startMonitoring({
    onBarcodeData: (barcode) => {
      console.log("Scanned:", barcode);
      // barcode is already decoded from Base64
    },
    onPrinterOnline: () => console.log("Printer online"),
    onPrinterOffline: () => console.log("Printer offline"),
    onCashDrawerOpen: () => console.log("Drawer opened"),
    onCashDrawerClose: () => console.log("Drawer closed"),
    onAccessoryConnect: () => console.log("Scanner connected"),
    onAccessoryDisconnect: () => console.log("Scanner disconnected"),
  });

  return disconnect; // cleanup on unmount
}, []);
```

### Printer & Device Status Monitoring

The ExtManager fires events as they happen. Here's the full list:

| Event | When |
|-------|------|
| `onPrinterOnline` | Printer becomes ready |
| `onPrinterOffline` | Printer goes offline (power, Bluetooth, etc.) |
| `onPrinterImpossible` | Printer hardware error |
| `onPrinterPaperReady` | Paper loaded and ready |
| `onPrinterPaperNearEmpty` | Paper roll running low |
| `onPrinterPaperEmpty` | Paper out |
| `onPrinterCoverOpen` | Printer cover opened |
| `onPrinterCoverClose` | Printer cover closed |
| `onCashDrawerOpen` | Cash drawer opened |
| `onCashDrawerClose` | Cash drawer closed |
| `onBarcodeDataReceive` | Barcode scanned (data is Base64) |
| `onAccessoryConnectSuccess` | USB accessory connected |
| `onAccessoryConnectFailure` | USB accessory failed to connect |
| `onAccessoryDisconnect` | USB accessory disconnected |

---

## URL Configuration

When running inside Star webPRNT Browser, use these URLs:

| Purpose | URL |
|---------|-----|
| Print / Drawer commands | `http://localhost:8001/StarWebPRNT/SendMessage` |
| ExtManager (monitoring) | `http://localhost:8001/StarWebPRNT/SendExtMessage` |

These are the **only** valid URLs when running inside webPRNT Browser. The `localhost:8001` is the native bridge running inside the app — it's not a configurable setting.

**Important:** When the Trader detects `localhost:8001` in the URL AND the user agent contains `webPRNTSupportMessageHandler` (which webPRNT Browser sets), it uses `webkit.messageHandlers` instead of XMLHttpRequest. This is handled automatically by the SDK.

---

## How the SDK Communicates Inside webPRNT Browser

```
Your Code                 SDK (Trader)              webPRNT Browser Native
─────────                 ────────────              ──────────────────────
sendMessage({request})
    │
    ├─ URL is localhost:8001?
    │  UA has webPRNTSupportMessageHandler?
    │
    ├─ YES ──► webkit.messageHandlers        ──►  Native Bluetooth ──► mPOP
    │          .sendMessageHandler
    │          .postMessage(JSON)
    │                                         ◄──  Response
    │          _onFinish callback             ◄──
    │          trader.onReceive(parsed)
    │
    └─ NO ───► XMLHttpRequest POST            ──►  HTTP to printer IP
               (for network printers,
                not used with webPRNT Browser)
```

The SDK checks the environment automatically. You don't need separate code paths.

---

## Response Handling

After sending a command via Trader, you get a `TraderResponse`:

```typescript
interface TraderResponse {
  traderSuccess: string;   // "true" if command was received
  traderCode: string;      // "0000" = OK
  traderStatus: string;    // hex string, 16 chars, parsed by helper methods
  status: number;          // HTTP status (200 = ok)
  responseText: string;    // raw XML response
}
```

**Important:** `traderSuccess: "true"` means the printer **received** the command, not that the action completed. For example, opening the cash drawer will return success even if the drawer is mechanically jammed.

You can inspect detailed status using Trader helper methods:

```typescript
const trader = new window.StarWebPrintTrader({ url });
const response = await sendRequest(trader, request);

if (trader.isPaperEnd(response)) {
  alert("Paper is out!");
}
if (trader.isCoverOpen(response)) {
  alert("Printer cover is open!");
}
```

---

## Builder Element Reference

All methods return XML strings. The full list from the SDK source:

| Method | Purpose | Key Options |
|--------|---------|-------------|
| `createInitializationElement()` | Reset printer state | `reset`, `print` |
| `createTextElement()` | Print text | `data`, `emphasis`, `width`, `height`, `codepage`, `international`, `underline`, `invert`, `font` |
| `createAlignmentElement()` | Set text alignment | `position`: `"left"`, `"center"`, `"right"` |
| `createPeripheralElement()` | Trigger cash drawer | `channel` (1-2), `on` (ms), `off` (ms) |
| `createCutPaperElement()` | Cut paper | `feed` (boolean), `type`: `"full"` or `"partial"` |
| `createBarcodeElement()` | Print 1D barcode | `symbology`, `data`, `width`, `hri`, `height` |
| `createQrCodeElement()` | Print QR code | `data`, `model`, `level`, `cell` |
| `createBitImageElement()` | Print raster image | `context` (Canvas2D), `width`, `height` |
| `createFeedElement()` | Feed paper | `line` or `unit` |
| `createLogoElement()` | Print stored logo | `number`, `width`, `height` |
| `createRuledLineElement()` | Print horizontal rule | `thickness`, `width` |
| `createSoundElement()` | Play buzzer sound | `channel`, `repeat` |
| `createRawDataElement()` | Send raw ESC/POS data | `data` (Base64 encoded) |

### Receipt Building Pattern

```typescript
const builder = new window.StarWebPrintBuilder();
let request = "";

// Always start with initialization
request += builder.createInitializationElement();

// Set alignment
request += builder.createAlignmentElement({ position: "center" });

// Large header
request += builder.createTextElement({
  data: "STORE NAME\n",
  emphasis: true,
  width: 2,
  height: 2,
});

// Normal text, left-aligned
request += builder.createAlignmentElement({ position: "left" });
request += builder.createTextElement({
  data: "Item 1          100.00\n",
  width: 1,
  height: 1,
});

// QR code for payment
request += builder.createAlignmentElement({ position: "center" });
request += builder.createQrCodeElement({
  data: "https://pay.example.com/tx/123",
  cell: 6,
  level: "level_m",
  model: "model2",
});

// Cut paper
request += builder.createCutPaperElement({ feed: true, type: "partial" });

// Open cash drawer after printing
request += builder.createPeripheralElement({ channel: 1, on: 200, off: 200 });
```

---

## ExtManager Event Reference

The ExtManager uses **polling** — it repeatedly calls the native bridge to check for events. Key config:

```typescript
const manager = new window.StarWebPrintExtManager({
  url: "http://localhost:8001/StarWebPRNT/SendExtMessage",
  pollingTimeout: 30000,    // max time to wait for response (min 10000ms)
  pollingInterval: 200,     // how often to poll (min 100ms, default 200ms)
});
```

**Lifecycle:**
1. `manager.connect()` — starts polling, claims the printer
2. Events fire via callbacks as they occur
3. `manager.disconnect()` — releases the claim, stops polling

**Only one ExtManager can claim the printer at a time.** If you have multiple tabs or components trying to connect, only the first will succeed. Always disconnect on cleanup.

---

## Next.js Static Export Notes

If your target is webPRNT Browser (which loads a URL), you'll likely want a **static export** so you can host the files on any static server:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // required for static export
};
```

This generates a plain `out/` directory with HTML, JS, and CSS files.

**Constraints with static export:**
- No API routes (no `app/api/` directory)
- No server-side rendering at request time
- No `next/image` optimization (hence `unoptimized: true`)
- All pages must be statically renderable

**Deployment:** Copy the `out/` directory to any web server. webPRNT Browser points to the URL where this is hosted.

---

## Porting Checklist

When porting this integration to another repo:

### Files to Copy

1. **SDK files** → place in your `public/` or static assets directory
   - `StarWebPrintTrader.js`
   - `StarWebPrintBuilder.js`
   - `StarWebPrintExtManager.js`

2. **Type declarations** → `src/lib/types.ts` (or your types directory)

3. **Wrapper functions** → `src/lib/webprnt.ts` (or your lib directory)

### Framework Integration

| Framework | How to load SDK scripts |
|-----------|------------------------|
| Next.js (App Router) | `<Script strategy="beforeInteractive">` in layout.tsx `<head>` |
| Next.js (Pages Router) | `<Script strategy="beforeInteractive">` in `_app.tsx` |
| Vite / React | `<script>` tags in `index.html` |
| Plain HTML | `<script>` tags in `<head>` |
| Nuxt / Vue | `useHead()` with script tags |

### Integration Checklist

- [ ] SDK files are accessible at runtime (check Network tab)
- [ ] Scripts load **before** app code (no "StarWebPrintTrader is not defined" errors)
- [ ] Load order: Trader → Builder → ExtManager
- [ ] Builder return values are **concatenated**, not chained
- [ ] Barcode data is **decoded from Base64** with `atob()`
- [ ] ExtManager `disconnect()` is called on component unmount / page unload
- [ ] URLs point to `localhost:8001` (don't change these for webPRNT Browser)
- [ ] Test on actual iPad with Star webPRNT Browser app (desktop browser won't have the native bridge)

### React Hook Pattern

```typescript
// Generic hook for any React-based framework
function useStarPrinter() {
  const [printerStatus, setPrinterStatus] = useState<"online" | "offline" | "unknown">("unknown");
  const [drawerStatus, setDrawerStatus] = useState<"open" | "closed" | "unknown">("unknown");
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (!window.StarWebPrintExtManager) return;

    const disconnect = startMonitoring({
      onBarcodeData: setLastBarcode,
      onPrinterOnline: () => setPrinterStatus("online"),
      onPrinterOffline: () => setPrinterStatus("offline"),
      onCashDrawerOpen: () => setDrawerStatus("open"),
      onCashDrawerClose: () => setDrawerStatus("closed"),
    });

    return disconnect;
  }, []);

  return { printerStatus, drawerStatus, lastBarcode };
}
```

---

## File Structure (POC Reference)

```
urthe-webprnt-poc/
├── next.config.ts              # output: "export", images: unoptimized
├── package.json
├── public/
│   └── star-sdk/
│       ├── StarWebPrintTrader.js
│       ├── StarWebPrintBuilder.js
│       └── StarWebPrintExtManager.js
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind v4 imports
│   │   ├── layout.tsx           # SDK script loading
│   │   └── page.tsx             # POC UI (all 3 features)
│   └── lib/
│       ├── types.ts             # TypeScript declarations for SDK
│       └── webprnt.ts           # Wrapper functions (portable)
```

---

## Complete Working Code

The POC repo at `urthe-webprnt-poc/` contains fully working, tested code. The two files you need to port are:

- **`src/lib/types.ts`** — TypeScript declarations (can be a `.d.ts` file)
- **`src/lib/webprnt.ts`** — All wrapper functions, zero framework dependencies

Everything else (layout, page, CSS) is framework-specific and should be adapted to your target project.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "สำเร็จ" but nothing happens | Builder return values not concatenated | Use `request += builder.createXxx()` pattern |
| `StarWebPrintTrader is not defined` | SDK not loaded yet | Use `strategy="beforeInteractive"` or check script load order |
| Barcode shows as garbage/encoded text | Not decoding Base64 | Use `atob(data.data)` |
| ExtManager connect returns false | Another connection is active | Ensure `disconnect()` is called on cleanup |
| Works in dev but not on iPad | Wrong URL or not using webPRNT Browser | Must open in Star webPRNT Browser app, URL must be `localhost:8001` |
| Print works but drawer doesn't | Wrong channel number | mPOP uses `channel: 1` |
| Thai text garbled | Wrong codepage | Try `codepage: "utf8"` in `createTextElement` |
| Timeout errors | Printer Bluetooth disconnected | Check iPad Bluetooth settings, re-pair mPOP |
| ExtManager events stop firing | Polling timeout exceeded | Increase `pollingTimeout` or reconnect |
