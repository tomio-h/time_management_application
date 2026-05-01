import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNavigation } from "./components/app-navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const applicationName = "Time Wallet";
const applicationDescription =
  "活動時間をタグで記録し、円グラフやカレンダーで振り返る時間家計簿アプリ";

export const metadata: Metadata = {
  title: applicationName,
  applicationName,
  description: applicationDescription,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: applicationName,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/time-wallet-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/time-wallet-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/time-wallet-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden flex flex-col bg-zinc-100 text-base text-zinc-950">
        <AppNavigation />
        <div className="flex w-full flex-1 flex-col pb-48 sm:pb-0">{children}</div>
      </body>
    </html>
  );
}
