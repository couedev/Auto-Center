"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Bell, CalendarDays, CarFront, CheckCircle2, ChevronRight, Clock3,
  CircleHelp, Settings, UserRound, X,
} from "lucide-react";
import MobileTabBar from "../mobile-tab-bar";
import { getServiceAppearance } from "../services";
import styles from "./user.module.css";

type Profile = { name: string; email: string; phone: string };
type Appointment = { id: string; serviceName: string; date: string; time: string; vehicle?: string; plate?: string; status?: string };
type BookingCredential = { id: string; token: string };
type SupportInfo = { companyName: string; whatsappEnabled: boolean; whatsappNumber: string | null };
type Sheet = "data" | "preferences" | "help" | null;

const defaultProfile: Profile = { name: "", email: "", phone: "" };
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isCredential(value: unknown): value is BookingCredential {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.token === "string";
}

function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} de ${shortMonths[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function statusLabel(status?: string) {
  switch (status) {
    case "pendente": return "Aguardando confirmação";
    case "confirmado": return "Agendamento confirmado";
    case "em_andamento": return "Em andamento";
    case "concluido": return "Concluído";
    case "cancelado": return "Cancelado";
    default: return "Solicitado";
  }
}

export default function UserPage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [draft, setDraft] = useState(defaultProfile);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [supportInfo, setSupportInfo] = useState<SupportInfo>({ companyName: "Auto CT", whatsappEnabled: false, whatsappNumber: null });
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    let active = true;

    void fetch("/api/app/catalog", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { config?: { name?: string; whatsappEnabled?: boolean; whatsappNumber?: string | null } };
      if (!active || !result.config) return;
      setSupportInfo({
        companyName: typeof result.config.name === "string" ? result.config.name : "Auto CT",
        whatsappEnabled: result.config.whatsappEnabled === true,
        whatsappNumber: typeof result.config.whatsappNumber === "string" ? result.config.whatsappNumber : null,
      });
    }).catch(() => {});

    async function loadUserData() {
      let credentials: BookingCredential[] = [];
      try {
        const storedProfile = window.localStorage.getItem("auto-ct-profile");
        if (storedProfile) {
          const parsed = { ...defaultProfile, ...JSON.parse(storedProfile) as Partial<Profile> };
          if (active) {
            setProfile(parsed);
            setDraft(parsed);
          }
        }
        const storedCredentials: unknown = JSON.parse(window.localStorage.getItem("auto-ct-booking-tokens") ?? "[]");
        if (Array.isArray(storedCredentials)) credentials = storedCredentials.filter(isCredential).slice(-20);
        if (active) {
          setNotifications(window.localStorage.getItem("auto-ct-user-notifications") !== "false");
          setReminders(window.localStorage.getItem("auto-ct-user-reminders") !== "false");
        }
      } catch {
        // O perfil e as preferências permanecem opcionais neste dispositivo.
      }

      if (!credentials.length) {
        if (active) {
          setAppointments([]);
          setAppointmentsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/app/bookings/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookings: credentials }),
        });
        const result = await response.json() as { appointments?: Appointment[]; message?: string };
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar seus agendamentos.");
        if (active) setAppointments(Array.isArray(result.appointments) ? result.appointments : []);
      } catch (cause) {
        if (active) setAppointmentsError(cause instanceof Error ? cause.message : "Não foi possível carregar seus agendamentos.");
      } finally {
        if (active) setAppointmentsLoading(false);
      }
    }

    void loadUserData();
    return () => { active = false; };
  }, []);

  function toggleNotifications() {
    const next = !notifications;
    setNotifications(next);
    try { window.localStorage.setItem("auto-ct-user-notifications", String(next)); } catch {}
  }

  function toggleReminders() {
    const next = !reminders;
    setReminders(next);
    try { window.localStorage.setItem("auto-ct-user-reminders", String(next)); } catch {}
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfile(draft);
    try { window.localStorage.setItem("auto-ct-profile", JSON.stringify(draft)); } catch {}
    setSheet(null);
  }

  const visibleAppointments = appointments.slice(0, 3);
  const supportDigits = supportInfo.whatsappNumber?.replace(/\D/g, "");
  const supportLink = supportInfo.whatsappEnabled && supportDigits ? `https://wa.me/${supportDigits}` : null;

  return (
    <div className={styles.canvas}>
      <main className={styles.app}>
        <div className={styles.content}>
          <header className={styles.header}><h1>Meu perfil</h1><span /></header>

          <button className={styles.profileCard} type="button" onClick={() => { setDraft(profile); setSheet("data"); }} aria-label="Editar meus dados">
            <span className={styles.avatar}><UserRound aria-hidden="true" /></span>
            <span className={styles.profileInfo}>
              <strong>{profile.name || "Visitante"}</strong>
              <span>{profile.email || "Toque para adicionar seus dados"}</span>
              <span>{profile.phone || "Seus dados ficam neste aparelho"}</span>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>

          <section className={styles.appointments} aria-labelledby="appointments-title">
            <h2 id="appointments-title" className={styles.sectionTitle}>Meus agendamentos</h2>
            {appointmentsLoading ? (
              <div className={styles.emptyAppointments} role="status"><CalendarDays aria-hidden="true" /><p>Carregando seus agendamentos...</p></div>
            ) : appointmentsError ? (
              <div className={styles.emptyAppointments} role="alert"><CalendarDays aria-hidden="true" /><p>{appointmentsError}</p><Link href="/aplicativo">Voltar ao início</Link></div>
            ) : visibleAppointments.length ? (
              <div className={styles.appointmentList}>
                {visibleAppointments.map((appointment) => {
                  const appearance = getServiceAppearance(appointment.serviceName);
                  return (
                    <article className={styles.appointmentCard} key={appointment.id}>
                      <div className={`${styles.appointmentThumb} ${styles[appearance.tone]}`} aria-hidden="true"><appearance.Icon strokeWidth={1.6} /></div>
                      <div className={styles.appointmentInfo}>
                        <strong>{appointment.serviceName}</strong>
                        <span><CarFront aria-hidden="true" />{appointment.vehicle || "Veículo não informado"}{appointment.plate ? ` · ${appointment.plate}` : ""}</span>
                        <span><CalendarDays aria-hidden="true" />{formatDate(appointment.date)}</span>
                        <span><Clock3 aria-hidden="true" />{appointment.time}</span>
                      </div>
                      <span className={`${styles.status} ${appointment.status === "cancelado" ? styles.statusCancelled : ""}`}><CheckCircle2 aria-hidden="true" />{statusLabel(appointment.status)}</span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyAppointments}><CalendarDays aria-hidden="true" /><p>Você ainda não tem agendamentos neste aparelho.</p><Link href="/aplicativo">Agendar um serviço</Link></div>
            )}
          </section>

          <section className={styles.settingsSection} aria-labelledby="settings-title">
            <h2 id="settings-title" className={styles.sectionTitle}>Configurações</h2>
            <div className={styles.settingsList}>
              <div className={styles.settingRow}><Bell aria-hidden="true" /><span>Notificações</span><button type="button" className={`${styles.switch} ${notifications ? styles.switchOn : ""}`} role="switch" aria-checked={notifications} aria-label="Notificações" onClick={toggleNotifications}><span /></button></div>
              <button className={styles.settingRow} type="button" onClick={() => { setDraft(profile); setSheet("data"); }}><UserRound aria-hidden="true" /><span>Meus dados</span><ChevronRight aria-hidden="true" /></button>
              <button className={styles.settingRow} type="button" onClick={() => setSheet("preferences")}><Settings aria-hidden="true" /><span>Preferências</span><ChevronRight aria-hidden="true" /></button>
              <button className={styles.settingRow} type="button" onClick={() => setSheet("help")}><CircleHelp aria-hidden="true" /><span>Ajuda e suporte</span><ChevronRight aria-hidden="true" /></button>
            </div>
          </section>
        </div>

        <MobileTabBar active="profile" />
      </main>

      {sheet && <div className={styles.sheetBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}><section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div className={styles.sheetHeading}><h2 id="sheet-title">{sheet === "data" ? "Meus dados" : sheet === "preferences" ? "Preferências" : "Ajuda e suporte"}</h2><button type="button" aria-label="Fechar" onClick={() => setSheet(null)}><X /></button></div>
        {sheet === "data" && <form className={styles.profileForm} onSubmit={saveProfile}><label>Nome<input autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label>E-mail<input type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required /></label><label>Telefone<input type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required /></label><button type="submit">Salvar meus dados</button></form>}
        {sheet === "preferences" && <div className={styles.sheetContent}><div className={styles.preferenceOption}><span>Receber lembretes de agendamento</span><button type="button" className={`${styles.switch} ${reminders ? styles.switchOn : ""}`} role="switch" aria-checked={reminders} aria-label="Receber lembretes de agendamento" onClick={toggleReminders}><span /></button></div><p>Suas preferências ficam salvas neste dispositivo.</p></div>}
        {sheet === "help" && <div className={styles.sheetContent}><p>Precisa de ajuda com um agendamento? Entre em contato com a equipe da {supportInfo.companyName}.</p>{supportLink ? <a href={supportLink} target="_blank" rel="noreferrer">Falar pelo WhatsApp</a> : <Link href="/aplicativo/agendamento">Ver agendamento</Link>}</div>}
      </section></div>}
    </div>
  );
}
