import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import AdminGate from "./auth-gate";

export const metadata: Metadata = {
  title: "Auto CT | Visão Geral",
  description: "Acompanhe faturamento, agendamentos e serviços do Auto CT.",
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Auto CT Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon/admin/icon-auto-admin-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon/admin/icon-auto-admin-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon/admin/icon-auto-admin-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
