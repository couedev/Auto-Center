"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Bell, CalendarDays, CarFront, CheckCircle2, ChevronRight, Clock3,
  CircleHelp, Settings, UserRound, X,
} from "lucide-react";
import MobileTabBar from "../mobile-tab-bar";
import { findService } from "../services";
import styles from "./user.module.css";

type Profile = { name: string; email: string; phone: string };
type Appointment = { id: string; serviceId: string; serviceName: string; date: string; time: string; status?: string };
type Sheet = "data" | "preferences" | "help" | null;

const defaultProfile: Profile = { name: "João Silva", email: "joao.silva@email.com", phone: "(11) 98765-4321" };
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isAppointment(value: unknown): value is Appointment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.serviceId === "string" && typeof item.serviceName === "string" && typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.time === "string";
}

function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} de ${shortMonths[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

export default function UserPage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [draft, setDraft] = useState(defaultProfile);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const storedProfile = window.localStorage.getItem("auto-ct-profile");
        if (storedProfile) {
          const parsed = { ...defaultProfile, ...JSON.parse(storedProfile) as Partial<Profile> };
          setProfile(parsed);
          setDraft(parsed);
        }
        const storedAppointments = JSON.parse(window.localStorage.getItem("auto-ct-appointments") ?? "[]") as unknown;
        if (Array.isArray(storedAppointments)) setAppointments(storedAppointments.filter(isAppointment));
        setNotifications(window.localStorage.getItem("auto-ct-user-notifications") !== "false");
        setReminders(window.localStorage.getItem("auto-ct-user-reminders") !== "false");
      } catch {
        // Dados locais indisponíveis: apresenta o perfil demonstrativo.
      }
    });
    return () => window.cancelAnimationFrame(frame);
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

  const visibleAppointments = appointments.slice(-3).reverse();

  return (
    <div className={styles.canvas}>
      <main className={styles.app}>
        <div className={styles.content}>
          <header className={styles.header}><h1>Meu perfil</h1><span /></header>

          <button className={styles.profileCard} type="button" onClick={() => { setDraft(profile); setSheet("data"); }} aria-label="Editar meus dados">
            <span className={styles.avatar}><UserRound aria-hidden="true" /></span>
            <span className={styles.profileInfo}><strong>{profile.name}</strong><span>{profile.email}</span><span>{profile.phone}</span></span>
            <ChevronRight aria-hidden="true" />
          </button>

          <section className={styles.appointments} aria-labelledby="appointments-title">
            <h2 id="appointments-title" className={styles.sectionTitle}>Meus agendamentos</h2>
            {visibleAppointments.length ? (
              <div className={styles.appointmentList}>
                {visibleAppointments.map((appointment) => {
                  const service = findService(appointment.serviceId);
                  return (
                    <article className={styles.appointmentCard} key={appointment.id}>
                      <div className={`${styles.appointmentThumb} ${styles[service.tone]}`} aria-hidden="true"><service.Icon strokeWidth={1.6} /></div>
                      <div className={styles.appointmentInfo}>
                        <strong>{appointment.serviceName}</strong>
                        <span><CarFront aria-hidden="true" />Auto CT - Matriz</span>
                        <span><CalendarDays aria-hidden="true" />{formatDate(appointment.date)}</span>
                        <span><Clock3 aria-hidden="true" />{appointment.time}</span>
                      </div>
                      <span className={styles.status}><CheckCircle2 aria-hidden="true" />{appointment.status || "Confirmado"}</span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyAppointments}><CalendarDays aria-hidden="true" /><p>Você ainda não tem agendamentos.</p><Link href="/aplicativo">Agendar um serviço</Link></div>
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
        {sheet === "data" && <form className={styles.profileForm} onSubmit={saveProfile}><label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label>E-mail<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required /></label><label>Telefone<input type="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required /></label><button type="submit">Salvar meus dados</button></form>}
        {sheet === "preferences" && <div className={styles.sheetContent}><div className={styles.preferenceOption}><span>Receber lembretes de agendamento</span><button type="button" className={`${styles.switch} ${reminders ? styles.switchOn : ""}`} role="switch" aria-checked={reminders} aria-label="Receber lembretes de agendamento" onClick={toggleReminders}><span /></button></div><p>Suas preferências ficam salvas neste dispositivo.</p></div>}
        {sheet === "help" && <div className={styles.sheetContent}><p>Precisa de ajuda com um agendamento? Entre em contato com a equipe da sua unidade Auto CT.</p><Link href="/aplicativo/agendamento">Ver agendamento</Link></div>}
      </section></div>}
    </div>
  );
}
