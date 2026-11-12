import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Aplicativo do Cliente",
  description: "Escolha um serviço e agende seu atendimento no Auto CT.",
};

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return children;
}
