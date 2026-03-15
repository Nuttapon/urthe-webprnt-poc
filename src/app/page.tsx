"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  openCashDrawer,
  printText,
  printAndOpenDrawer,
  startMonitoring,
} from "@/lib/webprnt";

type Status = "online" | "offline" | "unknown";
type DrawerStatus = "open" | "closed" | "unknown";
type ScannerStatus = "connected" | "disconnected" | "unknown";

interface ScanEntry {
  barcode: string;
  timestamp: Date;
}

interface ActionResult {
  success: boolean;
  message: string;
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  const color =
    status === "online" || status === "connected" || status === "closed"
      ? "bg-green-500"
      : status === "offline" || status === "disconnected" || status === "open"
        ? "bg-red-500"
        : "bg-gray-400";

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm text-gray-600">
        {label}: <span className="font-medium text-gray-900">{status}</span>
      </span>
    </div>
  );
}

const SAMPLE_RECEIPT = [
  "================================",
  "        URTHE STORE",
  "================================",
  "",
  "รายการทดสอบ          100.00",
  "สินค้าตัวอย่าง         250.00",
  "--------------------------------",
  "รวม                   350.00",
  "================================",
  "      ขอบคุณที่ใช้บริการ",
  "",
].join("\n");

export default function Home() {
  const [printerStatus, setPrinterStatus] = useState<Status>("unknown");
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("unknown");
  const [drawerStatus, setDrawerStatus] = useState<DrawerStatus>("unknown");
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = useCallback(
    async (name: string, action: () => Promise<unknown>) => {
      setLoading(name);
      setLastResult(null);
      try {
        await action();
        setLastResult({ success: true, message: `${name} สำเร็จ` });
      } catch (err) {
        setLastResult({
          success: false,
          message: `${name} ล้มเหลว: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      } finally {
        setLoading(null);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.StarWebPrintExtManager) return;

    const disconnect = startMonitoring({
      onBarcodeData: (barcode) => {
        setScanHistory((prev) => [
          { barcode, timestamp: new Date() },
          ...prev.slice(0, 49),
        ]);
      },
      onPrinterOnline: () => setPrinterStatus("online"),
      onPrinterOffline: () => setPrinterStatus("offline"),
      onCashDrawerOpen: () => setDrawerStatus("open"),
      onCashDrawerClose: () => setDrawerStatus("closed"),
      onAccessoryConnect: () => setScannerStatus("connected"),
      onAccessoryDisconnect: () => setScannerStatus("disconnected"),
    });

    return disconnect;
  }, []);

  return (
    <div className="min-h-screen p-4 max-w-lg mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">URTHE POS</h1>
          <Link
            href="/order"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            ไปหน้า POS →
          </Link>
        </div>
        <div className="flex flex-wrap gap-4">
          <StatusBadge label="Printer" status={printerStatus} />
          <StatusBadge label="Scanner" status={scannerStatus} />
          <StatusBadge label="Drawer" status={drawerStatus} />
        </div>
      </header>

      {/* Result toast */}
      {lastResult && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            lastResult.success
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {lastResult.message}
        </div>
      )}

      {/* Section 1: Cash Drawer */}
      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">ลิ้นชักเก็บเงิน</h2>
        <button
          onClick={() => handleAction("เปิดลิ้นชัก", openCashDrawer)}
          disabled={loading !== null}
          className="w-full py-4 px-6 bg-blue-600 text-white font-semibold rounded-lg text-lg active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "เปิดลิ้นชัก" ? "กำลังเปิด..." : "เปิดลิ้นชัก"}
        </button>
      </section>

      {/* Section 2: Barcode Scanner */}
      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Barcode Scanner</h2>

        {scanHistory.length > 0 ? (
          <>
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">
                สแกนล่าสุด
              </div>
              <div className="text-xl font-mono font-bold">
                {scanHistory[0].barcode}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {scanHistory[0].timestamp.toLocaleTimeString("th-TH")}
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto">
              <div className="text-xs text-gray-500 mb-2">
                ประวัติ ({scanHistory.length})
              </div>
              {scanHistory.map((entry, i) => (
                <div
                  key={`${entry.barcode}-${entry.timestamp.getTime()}`}
                  className={`flex justify-between py-1.5 text-sm ${
                    i > 0 ? "border-t border-gray-100" : ""
                  }`}
                >
                  <span className="font-mono">{entry.barcode}</span>
                  <span className="text-gray-400 text-xs">
                    {entry.timestamp.toLocaleTimeString("th-TH")}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            รอการสแกน...
          </div>
        )}
      </section>

      {/* Section 3: Test Print */}
      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">ทดสอบพิมพ์</h2>
        <div className="flex flex-col gap-3">
          <button
            onClick={() =>
              handleAction("ทดสอบพิมพ์", () => printText(SAMPLE_RECEIPT))
            }
            disabled={loading !== null}
            className="w-full py-4 px-6 bg-emerald-600 text-white font-semibold rounded-lg text-lg active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "ทดสอบพิมพ์" ? "กำลังพิมพ์..." : "ทดสอบพิมพ์"}
          </button>
          <button
            onClick={() =>
              handleAction("พิมพ์ + เปิดลิ้นชัก", () =>
                printAndOpenDrawer(SAMPLE_RECEIPT)
              )
            }
            disabled={loading !== null}
            className="w-full py-4 px-6 bg-amber-600 text-white font-semibold rounded-lg text-lg active:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "พิมพ์ + เปิดลิ้นชัก"
              ? "กำลังดำเนินการ..."
              : "พิมพ์ + เปิดลิ้นชัก"}
          </button>
        </div>
      </section>
    </div>
  );
}
