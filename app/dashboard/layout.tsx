import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import AdminGate from "./auth-gate";

export const metadata: Metadata = {
  title: "Auto CT | Visão Geral",
  description: "Acompanhe faturamento, agendamentos e serviços do Auto CT.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
