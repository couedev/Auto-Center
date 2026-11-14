"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  Bell, Brush, Building2, CalendarDays, Check, CheckCircle2,
  Clock3, House, MessageCircle, Package, Phone, Save,
  Settings, SlidersHorizontal, Store, Wrench,
} from "lucide-react";
import chrome from "../dashboard.module.css";
import styles from "./settings.module.css";
import DashboardActions from "../dashboard-actions";

type Theme = "dark" | "light";
type AutoCenterSettings = {
  company: string;
  phone: string;
  logoUrl: string;
  weekdayStart: string;
  weekdayEnd: string;
  saturdayStart: string;
  saturdayEnd: string;
  sundayStart: string;
  sundayEnd: string;
  notifications: boolean;
  autoConfirm: boolean;
  whatsapp: boolean;
  theme: Theme;
  accent: string;
};

const STORAGE_KEY = "auto-ct-settings";
const defaultSettings: AutoCenterSettings = {
  company: "Auto CT",
  phone: "",
  logoUrl: "",
  weekdayStart: "08:00",
  weekdayEnd: "18:00",
  saturdayStart: "08:00",
  saturdayEnd: "12:00",
  sundayStart: "",
  sundayEnd: "",
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
  const [isLoading, setIsLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored) as Partial<AutoCenterSettings>;
        setValues((current) => ({
          ...current,
          notifications: preferences.notifications ?? current.notifications,
          autoConfirm: preferences.autoConfirm ?? current.autoConfirm,
          theme: preferences.theme ?? current.theme,
          accent: preferences.accent ?? current.accent,
        }));
      }
    } catch {
      // Mantém as preferências iniciais quando o armazenamento local está indisponível.
    }

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        const result = await response.json() as {
          settings?: {
            nome_empresa: string;
            logo_url: string | null;
            whatsapp_numero: string | null;
            whatsapp_ativo: boolean;
            horarios_funcionamento: Record<string, { abre: string; fecha: string }>;
          };
          message?: string;
        };
        if (!response.ok || !result.settings) throw new Error(result.message || "Não foi possível carregar as configurações.");
        if (!active) return;
        const settings = result.settings;
        const hours = settings.horarios_funcionamento ?? {};
        setValues((current) => ({
          ...current,
          company: settings.nome_empresa,
          phone: settings.whatsapp_numero ?? "",
          logoUrl: settings.logo_url ?? "",
          weekdayStart: hours["1"]?.abre ?? "",
          weekdayEnd: hours["5"]?.fecha ?? hours["1"]?.fecha ?? "",
          saturdayStart: hours["6"]?.abre ?? "",
          saturdayEnd: hours["6"]?.fecha ?? "",
          sundayStart: hours["7"]?.abre ?? "",
          sundayEnd: hours["7"]?.fecha ?? "",
          whatsapp: settings.whatsapp_ativo,
        }));
        setSettingsLoaded(true);
      } catch (error) {
        if (active) setSavedMessage(error instanceof Error ? error.message : "Não foi possível carregar as configurações.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => { active = false; };
  }, []);

  function update<K extends keyof AutoCenterSettings>(key: K, value: AutoCenterSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Boolean(values.saturdayStart) !== Boolean(values.saturdayEnd) || Boolean(values.sundayStart) !== Boolean(values.sundayEnd)) {
      setSavedMessage("Preencha início e fim do horário para sábado e domingo, ou deixe os dois vazios.");
      return;
    }

    setIsSaving(true);
    setSavedMessage("");
    try {
      const weekday = { abre: values.weekdayStart, fecha: values.weekdayEnd };
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: values.company,
          whatsappNumber: values.phone,
          logoUrl: values.logoUrl,
          whatsappActive: values.whatsapp,
          hours: {
            "1": weekday,
            "2": weekday,
            "3": weekday,
            "4": weekday,
            "5": weekday,
            "6": values.saturdayStart ? { abre: values.saturdayStart, fecha: values.saturdayEnd } : null,
            "7": values.sundayStart ? { abre: values.sundayStart, fecha: values.sundayEnd } : null,
          },
        }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Não foi possível salvar as configurações.");

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notifications: values.notifications,
          autoConfirm: values.autoConfirm,
          theme: values.theme,
          accent: values.accent,
        }));
      } catch {
        // Preferências visuais continuam funcionando nesta sessão se o navegador bloquear armazenamento.
      }
      setSavedMessage("Alterações salvas com sucesso.");
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
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
          <Link href="/dashboard/servicos" className={chrome.navItem} aria-label="Serviços"><Wrench /></Link>
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
              <DashboardActions />
              <div className={chrome.menuAnchor}>
                <div className={chrome.branchButton}><Building2 className={chrome.branchIcon} /><span>{values.company}</span></div>
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
                  <label><span>WhatsApp</span><div className={styles.field}><Phone aria-hidden="true" /><input type="tel" value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Número com DDD" /></div></label>
                  <label><span>URL do logo</span><div className={styles.field}><input type="url" value={values.logoUrl} onChange={(event) => update("logoUrl", event.target.value)} placeholder="https://..." /></div></label>
                </div>
              </section>

              <section className={styles.card} aria-labelledby="hours-title">
                <div className={styles.cardHeading}><CalendarDays aria-hidden="true" /><div><h2 id="hours-title">Horário de funcionamento</h2><p>Defina os dias e horários de atendimento</p></div></div>
                <div className={styles.hoursList}>
                  <div className={styles.hoursRow}><div><CalendarDays aria-hidden="true" /><strong>Segunda a Sexta</strong></div><div className={styles.timeGroup}><Clock3 aria-hidden="true" /><label><span className={styles.srOnly}>Início de segunda a sexta</span><input type="time" required value={values.weekdayStart} onChange={(event) => update("weekdayStart", event.target.value)} /></label><span>–</span><label><span className={styles.srOnly}>Fim de segunda a sexta</span><input type="time" required value={values.weekdayEnd} onChange={(event) => update("weekdayEnd", event.target.value)} /></label></div></div>
                  <div className={styles.hoursRow}><div><CalendarDays aria-hidden="true" /><strong>Sábado</strong></div><div className={styles.timeGroup}><Clock3 aria-hidden="true" /><label><span className={styles.srOnly}>Início do sábado</span><input type="time" value={values.saturdayStart} onChange={(event) => update("saturdayStart", event.target.value)} /></label><span>–</span><label><span className={styles.srOnly}>Fim do sábado</span><input type="time" value={values.saturdayEnd} onChange={(event) => update("saturdayEnd", event.target.value)} /></label></div></div>
                  <div className={styles.hoursRow}><div><CalendarDays aria-hidden="true" /><strong>Domingo</strong></div><div className={styles.timeGroup}><Clock3 aria-hidden="true" /><label><span className={styles.srOnly}>Início do domingo</span><input type="time" value={values.sundayStart} onChange={(event) => update("sundayStart", event.target.value)} /></label><span>–</span><label><span className={styles.srOnly}>Fim do domingo</span><input type="time" value={values.sundayEnd} onChange={(event) => update("sundayEnd", event.target.value)} /></label></div></div>
                </div>
              </section>
            </div>

            <div className={styles.bottomGrid}>
              <section className={styles.card} aria-labelledby="preferences-title">
                <div className={styles.cardHeading}><SlidersHorizontal aria-hidden="true" /><div><h2 id="preferences-title">Preferências do sistema</h2><p>Ajuste o comportamento e automatizações do sistema</p></div></div>
                <div className={styles.preferenceList}>
                  <div className={styles.preferenceRow}><Bell aria-hidden="true" /><div><strong>Receber notificações</strong><span>Alertas de agendamentos, serviços e atualizações</span></div><button type="button" className={`${styles.switch} ${values.notifications ? styles.switchOn : ""}`} role="switch" aria-checked={values.notifications} aria-label="Receber notificações" onClick={() => update("notifications", !values.notifications)}><span /></button></div>
                  <div className={styles.preferenceRow}><CheckCircle2 aria-hidden="true" /><div><strong>Confirmação automática</strong><span>Confirmar agendamentos automaticamente</span></div><button type="button" className={`${styles.switch} ${values.autoConfirm ? styles.switchOn : ""}`} role="switch" aria-checked={values.autoConfirm} aria-label="Confirmação automática" onClick={() => update("autoConfirm", !values.autoConfirm)}><span /></button></div>
                  <div className={styles.preferenceRow}><MessageCircle aria-hidden="true" /><div><strong>WhatsApp da empresa ativo</strong><span>Exibir o canal para contato nos fluxos públicos</span></div><button type="button" className={`${styles.switch} ${values.whatsapp ? styles.switchOn : ""}`} role="switch" aria-checked={values.whatsapp} aria-label="Ativar WhatsApp da empresa" onClick={() => update("whatsapp", !values.whatsapp)}><span /></button></div>
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

            <div className={styles.saveRow}><p role="status">{isLoading ? "Carregando configurações..." : savedMessage}</p><button className={styles.saveButton} type="submit" disabled={isLoading || !settingsLoaded || isSaving}><Save aria-hidden="true" />{isSaving ? "Salvando..." : "Salvar alterações"}</button></div>
          </form>
        </div>
      </main>
    </div>
  );
}
