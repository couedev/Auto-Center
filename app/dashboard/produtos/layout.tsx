import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Auto CT | Produtos",
  description: "Cadastro e estoque de produtos do Auto CT.",
};

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return children;
}
