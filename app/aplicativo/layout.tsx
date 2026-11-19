import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaInstallPrompt from "../pwa-install-prompt";
import styles from "./gesture-scope.module.css";

export const metadata: Metadata = {
  title: "Auto CT | Aplicativo",
  description: "Escolha um serviço e agende seu atendimento no Auto CT.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10130e",
};

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return <div className={styles.scope}>{children}<PwaInstallPrompt /></div>;
}
