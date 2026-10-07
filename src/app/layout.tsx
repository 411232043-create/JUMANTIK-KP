import type { Metadata, Viewport } from "next";
import PwaClient from "@/components/pwa-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jumantik Online — Sistem Digitalisasi Kelurahan",
  description:
    "Platform pemantauan jentik nyamuk dan kesehatan lingkungan berbasis digital.",
  applicationName: "Jumantik Online",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Jumantik" }
};

export const viewport: Viewport = {
  themeColor: "#065F46",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <PwaClient />
      </body>
    </html>
  );
}
