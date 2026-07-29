import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";

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
      <body className="min-h-full flex flex-col bg-transparent text-slate-900 dark:text-slate-100 relative" suppressHydrationWarning>
        <Script defer src="https://cloud.umami.is/script.js" data-website-id="d3c67e94-c651-44dd-98af-9d40fa3a16e9" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="premium-bg"></div>
          <Header />
          <main className="flex-1 flex flex-col items-center">{children}</main>
          <Footer />
          <Analytics />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }

              // Code Protection
              document.addEventListener('contextmenu', event => event.preventDefault());
              document.addEventListener('keydown', (e) => {
                  if (e.key === 'F12' || 
                      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
                      (e.ctrlKey && e.key === 'U')) {
                      e.preventDefault();
                  }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
