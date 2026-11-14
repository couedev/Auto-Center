import type { Metadata } from "next";
import type { ReactNode } from "react";
import PwaInstallPrompt from "./pwa-install-prompt";

export const metadata: Metadata = {
  title: "Auto CT | Aplicativo",
  description: "Escolha um serviço e agende seu atendimento no Auto CT.",
};

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return <>{children}<PwaInstallPrompt /></>;
}
