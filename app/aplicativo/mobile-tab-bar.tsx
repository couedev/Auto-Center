import Link from "next/link";
import { CalendarDays, House, UserRound } from "lucide-react";
import styles from "./tab-bar.module.css";

export default function MobileTabBar({ active }: { active: "home" | "booking" | "profile" }) {
  return (
    <nav className={styles.tabBar} aria-label="Navegação do aplicativo">
      <Link href="/aplicativo" className={active === "home" ? styles.activeTab : ""} aria-current={active === "home" ? "page" : undefined} aria-label="Início"><House /></Link>
      <Link href="/aplicativo/agendamento" className={active === "booking" ? styles.activeTab : ""} aria-current={active === "booking" ? "page" : undefined} aria-label="Agendamento"><CalendarDays /></Link>
      <Link href="/aplicativo/usuario" className={active === "profile" ? styles.activeTab : ""} aria-current={active === "profile" ? "page" : undefined} aria-label="Meu perfil"><UserRound /></Link>
    </nav>
  );
}
