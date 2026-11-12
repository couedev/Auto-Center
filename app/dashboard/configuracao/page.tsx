"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  Bell, Brush, Building2, CalendarDays, Check, CheckCircle2, ChevronDown,
  Clock3, House, Mail, MapPin, MessageCircle, Package, Phone, Save,
  Settings, SlidersHorizontal, Store,
} from "lucide-react";
import chrome from "../dashboard.module.css";
import styles from "./settings.module.css";

type Theme = "dark" | "light";
type AutoCenterSettings = {
  company: string;
  phone: string;
  email: string;
  address: string;
  weekdayStart: string;
  weekdayEnd: string;
  saturdayStart: string;
  saturdayEnd: string;
  notifications: boolean;
  autoConfirm: boolean;
  whatsapp: boolean;
  theme: Theme;
  accent: string;
};

const STORAGE_KEY = "auto-ct-settings";
const defaultSettings: AutoCenterSettings = {
  company: "Auto CT – Auto Center",
  phone: "(11) 4235-6800",
  email: "contato@autoct.com.br",
  address: "Av. Paulista, 1578 – Bela Vista, São Paulo – SP",
  weekdayStart: "08:00",
  weekdayEnd: "18:00",
  saturdayStart: "08:00",
  saturdayEnd: "12:00",
  notifications: true,
  autoConfirm: false,
  whatsapp: true,
  theme: "dark",
  accent: "#a7ef00",
};

const accentColors = ["#a7ef00", "#17b8ea", "#9144e9", "#ff961c", "#f44652"];

function ThemePreview({ theme, selected }: { theme: Theme; selected: boolean }) {
  return (
    <span className={`${styles.themePreview} ${theme === "light" ? styles.lightPreview : styles.darkPreview} ${selected ? styles.selectedPreview : ""}`} aria-hidden="true">
      <span className={styles.previewSidebar}><i /><i /><i /></span>
      <span className={styles.previewContent}>
        <i /><span><i /><i /></span><span><i /><i /></span>
        <svg viewBox="0 0 76 30"><path d="M3 24 23 17 42 19 63 9 73 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
      </span>
      <span className={styles.previewCheck}>{selected ? <Check /> : null}</span>
    </span>
  );
}

export default function SettingsPage() {
  const [values, setValues] = useState(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [branch, setBranch] = useState("Auto CT - Matriz");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setValues({ ...defaultSettings, ...JSON.parse(stored) as Partial<AutoCenterSettings> });
      } catch {
        // Mantém os valores iniciais quando o armazenamento está indisponível.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function update<K extends keyof AutoCenterSettings>(key: K, value: AutoCenterSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      setSavedMessage("Alterações salvas neste navegador.");
    } catch {
      setSavedMessage("Não foi possível salvar neste navegador.");
    }
  }

  const rootStyle = { "--lime": values.accent, "--settings-accent": values.accent } as CSSProperties;

  return (
    <div className={`${chrome.dashboard} ${styles.settingsPage} ${values.theme === "light" ? styles.lightTheme : ""}`} style={rootStyle}>
      <div className={chrome.honeycombTop} aria-hidden="true" />
      <div className={chrome.honeycombBottom} aria-hidden="true" />
      <aside className={chrome.sidebar} aria-label="Navegação principal">
        <nav className={chrome.navigation}>
          <Link href="/dashboard" className={chrome.navItem} aria-label="Visão geral"><House /></Link>
          <Link href="/dashboard/produtos" className={chrome.navItem} aria-label="Produtos"><Package /></Link>
          <Link href="/dashboard/configuracao" className={`${chrome.navItem} ${chrome.navActive}`} aria-label="Configurações" aria-current="page"><Settings /></Link>
        </nav>
      </aside>

      <main className={chrome.main}>
        <div className={chrome.content}>
          <header className={chrome.topbar}>
            <Link href="/dashboard" className={chrome.logoLink} aria-label="Auto CT, visão geral">
              <Image src="/assets/Auto%20CT%20transparent%20logo-2.webp" alt="Auto CT Auto Center" width={420} height={210} priority className={chrome.logo} style={{ width: "100%", height: "auto" }} />
            </Link>
            <div className={chrome.topActions}>
              <div className={chrome.menuAnchor}>
                <button className={chrome.notificationButton} type="button" aria-label="Notificações" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((current) => !current)}><Bell /><span className={chrome.notificationDot} /></button>
                {notificationsOpen && <div className={`${chrome.popover} ${chrome.notificationPopover}`} role="status"><strong>Tudo em dia</strong><span>Você não tem novas notificações.</span></div>}
              </div>
              <div className={chrome.menuAnchor}>
                <button className={chrome.branchButton} type="button" aria-expanded={branchMenuOpen} onClick={() => setBranchMenuOpen((current) => !current)}><Building2 className={chrome.branchIcon} /><span>{branch}</span><ChevronDown className={chrome.chevron} /></button>
                {branchMenuOpen && <div className={`${chrome.popover} ${chrome.branchPopover}`} role="menu" aria-label="Selecionar unidade">{["Auto CT - Matriz", "Auto CT - Unidade Sul"].map((name) => <button key={name} type="button" role="menuitem" onClick={() => { setBranch(name); setBranchMenuOpen(false); }}><Building2 />{name}{branch === name && <Check />}</button>)}</div>}
              </div>
            </div>
          </header>

          <div className={styles.pageHeading}><h1>Configurações</h1><span /></div>

          <form onSubmit={saveSettings}>
            <div className={styles.topGrid}>
              <section className={`${styles.card} ${styles.companyCard}`} aria-labelledby="company-title">
                <div className={styles.cardHeading}><Store aria-hidden="true" /><div><h2 id="company-title">Informações da empresa</h2><p>Dados principais do seu auto center</p></div></div>
                <div className={styles.companyFields}>
                  <label><span>Nome da empresa</span><div className={styles.field}><input value={values.company} onChange={(event) => update("company", event.target.value)} required /></div></label>
                  <label><span>Telefone</span><div className={styles.field}><Phone aria-hidden="true" /><input type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} required /></div></label>
                  <label><span>E-mail</span><div className={styles.field}><Mail aria-hidden="true" /><input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} required /></div></label>
                  <label><span>Endereço</span><div className={styles.field}><MapPin aria-hidden="true" /><input value={values.address} onChange={(event) => update("address", event.target.value)} required /></div></label>
                </div>
              </section>

              <section className={styles.card} aria-labelledby="hours-title">
                <div className={styles.cardHeading}><CalendarDays aria-hidden="true" /><div><h2 id="hours-title">Horário de funcionamento</h2><p>Defina os dias e horários de atendimento</p></div></div>
                <div className={styles.hoursList}>
                  <div className={styles.hoursRow}><div><CalendarDays aria-hidden="true" /><strong>Segunda a Sexta</strong></div><div className={styles.timeGroup}><Clock3 aria-hidden="true" /><label><span className={styles.srOnly}>Início de segunda a sexta</span><input type="time" value={values.weekdayStart} onChange={(event) => update("weekdayStart", event.target.value)} /></label><span>–</span><label><span className={styles.srOnly}>Fim de segunda a sexta</span><input type="time" value={values.weekdayEnd} onChange={(event) => update("weekdayEnd", event.target.value)} /></label></div></div>
                  <div className={styles.hoursRow}><div><CalendarDays aria-hidden="true" /><strong>Sábado</strong></div><div className={styles.timeGroup}><Clock3 aria-hidden="true" /><label><span className={styles.srOnly}>Início do sábado</span><input type="time" value={values.saturdayStart} onChange={(event) => update("saturdayStart", event.target.value)} /></label><span>–</span><label><span className={styles.srOnly}>Fim do sábado</span><input type="time" value={values.saturdayEnd} onChange={(event) => update("saturdayEnd", event.target.value)} /></label></div></div>
                </div>
              </section>
            </div>

            <div className={styles.bottomGrid}>
              <section className={styles.card} aria-labelledby="preferences-title">
                <div className={styles.cardHeading}><SlidersHorizontal aria-hidden="true" /><div><h2 id="preferences-title">Preferências do sistema</h2><p>Ajuste o comportamento e automatizações do sistema</p></div></div>
                <div className={styles.preferenceList}>
                  <div className={styles.preferenceRow}><Bell aria-hidden="true" /><div><strong>Receber notificações</strong><span>Alertas de agendamentos, serviços e atualizações</span></div><button type="button" className={`${styles.switch} ${values.notifications ? styles.switchOn : ""}`} role="switch" aria-checked={values.notifications} aria-label="Receber notificações" onClick={() => update("notifications", !values.notifications)}><span /></button></div>
                  <div className={styles.preferenceRow}><CheckCircle2 aria-hidden="true" /><div><strong>Confirmação automática</strong><span>Confirmar agendamentos automaticamente</span></div><button type="button" className={`${styles.switch} ${values.autoConfirm ? styles.switchOn : ""}`} role="switch" aria-checked={values.autoConfirm} aria-label="Confirmação automática" onClick={() => update("autoConfirm", !values.autoConfirm)}><span /></button></div>
                  <div className={styles.preferenceRow}><MessageCircle aria-hidden="true" /><div><strong>Lembrar clientes por WhatsApp</strong><span>Enviar lembretes automáticos de agendamentos</span></div><button type="button" className={`${styles.switch} ${values.whatsapp ? styles.switchOn : ""}`} role="switch" aria-checked={values.whatsapp} aria-label="Lembrar clientes por WhatsApp" onClick={() => update("whatsapp", !values.whatsapp)}><span /></button></div>
                </div>
              </section>

              <section className={styles.card} aria-labelledby="appearance-title">
                <div className={styles.cardHeading}><Brush aria-hidden="true" /><div><h2 id="appearance-title">Aparência</h2><p>Personalize o visual do sistema</p></div></div>
                <div className={styles.appearanceContent}>
                  <div className={styles.themeChoices} role="group" aria-label="Tema do sistema">
                    <button type="button" className={values.theme === "dark" ? styles.themeSelected : ""} aria-pressed={values.theme === "dark"} onClick={() => update("theme", "dark")}><ThemePreview theme="dark" selected={values.theme === "dark"} /><strong>Tema Escuro</strong><span>Padrão (recomendado)</span></button>
                    <button type="button" className={values.theme === "light" ? styles.themeSelected : ""} aria-pressed={values.theme === "light"} onClick={() => update("theme", "light")}><ThemePreview theme="light" selected={values.theme === "light"} /><strong>Tema Claro</strong><span>Interface clara e limpa</span></button>
                  </div>
                  <div className={styles.accentPicker}><strong>Cor de destaque</strong><div role="group" aria-label="Cor de destaque">{accentColors.map((color) => <button key={color} type="button" style={{ background: color }} className={values.accent === color ? styles.accentSelected : ""} aria-label={`Selecionar cor ${color}`} aria-pressed={values.accent === color} onClick={() => update("accent", color)}>{values.accent === color && <Check />}</button>)}</div></div>
                </div>
              </section>
            </div>

            <div className={styles.saveRow}><p role="status">{savedMessage}</p><button className={styles.saveButton} type="submit"><Save aria-hidden="true" />Salvar alterações</button></div>
          </form>
        </div>
      </main>
    </div>
  );
}
