import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Meu perfil",
  description: "Perfil e agendamentos do cliente Auto CT.",
};

export default function UserLayout({ children }: { children: ReactNode }) {
  return children;
}
