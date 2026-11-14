import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegister from "./pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto CT | Auto Center",
  description: "Agende serviços e acompanhe os atendimentos da Auto CT.",
  applicationName: "Auto CT",
  appleWebApp: {
    capable: true,
    title: "Auto CT",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon/icon-auto-center-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon/icon-auto-center-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon/icon-auto-center-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10130e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
