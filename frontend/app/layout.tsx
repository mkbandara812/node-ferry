import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NodeFerry - Secure P2P File Sharing",
  description: "Instant, cross-network, peer-to-peer file sharing directly from your browser. No limits, pure speed.",
  keywords: ["file sharing", "p2p", "webrtc", "send files", "secure transfer", "nodeferry"],
  openGraph: {
    title: "NodeFerry - Send Files. Move Ideas.",
    description: "The simplest way to send big files around the world. No limits, pure peer-to-peer.",
    url: "https://nodeferry.com",
    siteName: "NodeFerry",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NodeFerry - Secure P2P File Sharing",
    description: "Instant, cross-network, peer-to-peer file sharing directly from your browser.",
    images: ["/og-image.jpg"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100" suppressHydrationWarning>
        <Header />
        <main className="flex-1 flex flex-col items-center">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
