import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Serviços",
  description: "Cadastro de serviços, preços e duração dos atendimentos do Auto CT.",
};

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}
