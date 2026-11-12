import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Configurações",
  description: "Dados da empresa, horários e preferências do Auto CT.",
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
