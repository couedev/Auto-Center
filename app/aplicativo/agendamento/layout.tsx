import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Agendamento",
  description: "Escolha a data e o horário do seu atendimento no Auto CT.",
};

export default function BookingLayout({ children }: { children: ReactNode }) {
  return children;
}
