import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "URTHE POS — WebPRNT POC",
  description: "Star mPOP WebPRNT Browser POC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <Script
          src="/star-sdk/StarWebPrintTrader.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/star-sdk/StarWebPrintBuilder.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/star-sdk/StarWebPrintExtManager.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
