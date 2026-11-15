"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CalendarDays, CarFront, Clock3, UserRound, Volume2, X } from "lucide-react";
import styles from "./appointment-notification.module.css";

type NewAppointment = {
  id: string;
  createdAt: string;
  time: string;
  customer: string;
  vehicle: string;
  service: string;
  amount: number;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pollingInterval = 15_000;

export default function AppointmentNotification() {
  const [queue, setQueue] = useState<NewAppointment[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckedAtRef = useRef<string | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const isInitialCheckRef = useRef(true);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const appointment = queue[0] ?? null;

  useEffect(() => {
    const audio = new Audio("/sounds/sound-notifica%C3%A7%C3%A3o.mp3");
    audio.preload = "auto";
    audioRef.current = audio;
    audio.load();

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function checkForAppointments() {
      try {
        const query = lastCheckedAtRef.current
          ? `?since=${encodeURIComponent(lastCheckedAtRef.current)}`
          : "";
        const response = await fetch(`/api/admin/appointments/recent${query}`, { cache: "no-store" });
        if (!response.ok) return;

        const result = await response.json() as {
          checkedAt?: string;
          appointments?: NewAppointment[];
        };
        if (!active || !result.checkedAt || !Array.isArray(result.appointments)) return;

        const found = result.appointments.filter((item) => !seenIdsRef.current.has(item.id));
        result.appointments.forEach((item) => seenIdsRef.current.add(item.id));
        lastCheckedAtRef.current = result.checkedAt;

        if (isInitialCheckRef.current) {
          isInitialCheckRef.current = false;
        } else if (found.length) {
          setQueue((current) => [...current, ...found.reverse()]);
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            void audio.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
          }
        }
      } catch {
        // A temporary network error is retried on the next polling cycle.
      } finally {
        if (active) timeoutId = setTimeout(checkForAppointments, pollingInterval);
      }
    }

    void checkForAppointments();
    return () => {
      active = false;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!appointment) return;
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setQueue((current) => current.slice(1));
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [appointment]);

  function enableSound() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
  }

  if (!appointment) return null;

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) setQueue((current) => current.slice(1));
    }}>
      <section className={styles.popup} role="dialog" aria-modal="true" aria-labelledby="new-appointment-title" aria-describedby="new-appointment-description">
        <div className={styles.topLine}>
          <span className={styles.iconBadge}><BellRing aria-hidden="true" /></span>
          <span className={styles.liveBadge}><i /> Novo</span>
          <button ref={closeButtonRef} className={styles.closeButton} type="button" onClick={() => setQueue((current) => current.slice(1))} aria-label="Fechar notificação">
            <X aria-hidden="true" />
          </button>
        </div>

        <p className={styles.eyebrow}>A agenda recebeu uma atualização</p>
        <h2 id="new-appointment-title">Novo agendamento</h2>
        <p id="new-appointment-description" className={styles.description}>Um novo serviço foi marcado para a sua empresa.</p>

        <div className={styles.amountCard}>
          <span>Valor do pedido</span>
          <strong>{money.format(appointment.amount)}</strong>
        </div>

        <div className={styles.details}>
          <div><UserRound aria-hidden="true" /><span><small>Cliente</small><strong>{appointment.customer}</strong></span></div>
          <div><CalendarDays aria-hidden="true" /><span><small>Data e horário</small><strong>{appointment.time}</strong></span></div>
          <div><CarFront aria-hidden="true" /><span><small>Veículo</small><strong>{appointment.vehicle}</strong></span></div>
          <div><Clock3 aria-hidden="true" /><span><small>Serviço</small><strong>{appointment.service}</strong></span></div>
        </div>

        <div className={styles.actions}>
          {soundBlocked && <button type="button" className={styles.soundButton} onClick={enableSound}><Volume2 aria-hidden="true" />Ativar som</button>}
          <button type="button" className={styles.dismissButton} onClick={() => setQueue((current) => current.slice(1))}>Entendi</button>
        </div>
        {queue.length > 1 && <p className={styles.queueNote}>+ {queue.length - 1} novo{queue.length > 2 ? "s" : ""} agendamento{queue.length > 2 ? "s" : ""} na fila</p>}
      </section>
    </div>
  );
}
