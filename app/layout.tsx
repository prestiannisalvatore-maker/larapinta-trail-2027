import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Larapinta Trail 2027",
  description:
    "East-to-west 20-day Larapinta Trail itinerary for Salvatore Prestianni and James Saville — map, water, food drops, flights and gear.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Larapinta 2027",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#140c08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <ServiceWorkerRegister />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
