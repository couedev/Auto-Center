import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Visão Geral",
  description: "Acompanhe faturamento, agendamentos e serviços do Auto CT.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
