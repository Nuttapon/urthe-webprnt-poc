# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POS (Point of Sale) proof-of-concept built for iPad deployment via Star mPOP's webPRNT Browser. The app communicates with Star mPOP hardware (receipt printer, cash drawer, barcode scanner) through a localhost:8001 native bridge provided by the webPRNT Browser app.

## Commands

```bash
npm run dev    # Start dev server
npm run build  # Static export build (output: /out)
npm run start  # Serve production build
```

No test or lint scripts are configured.

## Architecture

**Stack:** Next.js 16 (App Router, static export), React 19, TypeScript (strict), Tailwind CSS 4

**All pages are client-side only** (`"use client"`) — static export mode with no SSR.

### Pages

- `/` — Hardware test dashboard (printer status, barcode scan log, test print, cash drawer)
- `/order` — POS order flow with state machine via `useReducer` (idle → active → payment_select → processing → complete)
- `/order/history` — Order ledger using `useSyncExternalStore` for external state subscription

### Key Libraries (`src/lib/`)

- **webprnt.ts** — Wrapper around Star SDK globals (`StarWebPrintTrader`, `StarWebPrintBuilder`, `StarWebPrintExtManager`). Provides `printText()`, `openCashDrawer()`, `printAndOpenDrawer()`, `startMonitoring()`.
- **scanner.ts** — Module-level singleton for barcode/status monitoring with lazy initialization (`ensureConnected()`). Pub/sub via `onBarcode()` and `onStatus()`.
- **order-history.ts** — In-memory order store with pre-computed snapshot pattern and change notification (pub/sub with `Set<listener>`).
- **receipt.ts** — Receipt text formatter (32-char width).
- **products.ts** — Hardcoded product catalog with SKU-based lookup.
- **types.ts** — TypeScript declarations for Star SDK globals on `window`.
- **pos-types.ts** — Domain types: `Product`, `OrderItem`, `Order`, `PaymentMethod`, `OrderStatus`.

### Star SDK Integration

Three SDK scripts are loaded in `layout.tsx` via `beforeInteractive` strategy from `/public/star-sdk/`. These attach `StarWebPrintTrader`, `StarWebPrintBuilder`, and `StarWebPrintExtManager` to the global `window` object.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).
