"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, LoaderCircle, LogOut, Package, Settings, Wrench, X } from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardActions() {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !actionsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!notificationsOpen && !settingsOpen && !confirmLogout) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmLogout) {
        if (!isLoggingOut) setConfirmLogout(false);
      } else {
        setNotificationsOpen(false);
        setSettingsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [notificationsOpen, settingsOpen, confirmLogout, isLoggingOut]);

  async function signOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Não foi possível sair agora. Tente novamente.");
      setIsLoggingOut(false);
    }
  }

  function openLogoutConfirmation() {
    setSettingsOpen(false);
    setLogoutError("");
    setConfirmLogout(true);
  }

  return (
    <div className={styles.dashboardActions} ref={actionsRef}>
      <div className={styles.menuAnchor}>
        <button
          className={styles.notificationButton}
          type="button"
          aria-label="Notificações"
          aria-expanded={notificationsOpen}
          onClick={() => {
            setSettingsOpen(false);
            setNotificationsOpen((open) => !open);
          }}
        >
          <Bell aria-hidden="true" />
          <span className={styles.notificationDot} />
        </button>
        {notificationsOpen && (
          <div className={`${styles.popover} ${styles.notificationPopover}`} role="status">
            <strong>Tudo em dia</strong>
            <span>Você não tem novas notificações.</span>
          </div>
        )}
      </div>

      <div className={styles.menuAnchor}>
        <button
          className={styles.settingsButton}
          type="button"
          aria-label="Abrir menu"
          aria-haspopup="menu"
          aria-expanded={settingsOpen}
          onClick={() => {
            setNotificationsOpen(false);
            setSettingsOpen((open) => !open);
          }}
        >
          <Settings aria-hidden="true" />
        </button>
        {settingsOpen && (
          <nav className={styles.actionMenu} aria-label="Menu da conta" role="menu">
            <Link href="/dashboard/produtos" role="menuitem" className={styles.actionMenuItem} onClick={() => setSettingsOpen(false)}>
              <Package aria-hidden="true" />Produtos
            </Link>
            <Link href="/dashboard/servicos" role="menuitem" className={styles.actionMenuItem} onClick={() => setSettingsOpen(false)}>
              <Wrench aria-hidden="true" />Serviços
            </Link>
            <Link href="/dashboard/configuracao" role="menuitem" className={styles.actionMenuItem} onClick={() => setSettingsOpen(false)}>
              <Settings aria-hidden="true" />Configurações
            </Link>
            <span className={styles.menuSeparator} />
            <button type="button" role="menuitem" className={`${styles.actionMenuItem} ${styles.actionMenuLogout}`} onClick={openLogoutConfirmation}>
              <LogOut aria-hidden="true" />Sair da conta
            </button>
          </nav>
        )}
      </div>

      {confirmLogout && typeof document !== "undefined" && createPortal(
        <div className={styles.logoutOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoggingOut) setConfirmLogout(false); }}>
          <section className={styles.logoutDialog} role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
            <div className={styles.logoutHeading}>
              <div><span className={styles.logoutIcon}><LogOut aria-hidden="true" /></span><h2 id="logout-title">Sair da conta?</h2></div>
              <button type="button" aria-label="Fechar confirmação" onClick={() => setConfirmLogout(false)} disabled={isLoggingOut}><X /></button>
            </div>
            <p id="logout-description">Você precisará entrar novamente para acessar o painel.</p>
            {logoutError && <p className={styles.logoutError} role="alert">{logoutError}</p>}
            <div className={styles.logoutActions}>
              <button type="button" className={styles.logoutCancel} onClick={() => setConfirmLogout(false)} disabled={isLoggingOut}>Cancelar</button>
              <button type="button" className={styles.logoutConfirm} onClick={signOut} disabled={isLoggingOut}>
                {isLoggingOut ? <LoaderCircle aria-hidden="true" className={styles.spinning} /> : <LogOut aria-hidden="true" />}
                {isLoggingOut ? "Saindo..." : "Sair da conta"}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
