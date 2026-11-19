"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, CalendarDays, CarFront, Clock3, UserRound, Volume2, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
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
type RecentAppointmentsResult = { checkedAt: string; appointments: NewAppointment[] };
type AppointmentNotificationProps = { onNewAppointment?: () => void };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AppointmentNotification({ onNewAppointment }: AppointmentNotificationProps) {
  const [queue, setQueue] = useState<NewAppointment[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onNewAppointmentRef = useRef(onNewAppointment);
  onNewAppointmentRef.current = onNewAppointment;
  const lastCheckedAtRef = useRef<string | null>(null);
  const seenIdsRef = useRef(new Set<string>());
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const appointment = queue[0] ?? null;

  useEffect(() => {
    const audio = new Audio("/sounds/sound-notifica%C3%A7%C3%A3o.mp3");
    audio.preload = "auto";
    audioRef.current = audio;
    audio.load();

    let active = true;
    let syncing = false;
    let syncAgain = false;
    let channel: RealtimeChannel | null = null;
    const supabase = createSupabaseClient();

    async function fetchRecent(since?: string): Promise<RecentAppointmentsResult | null> {
      try {
        const query = since ? `?since=${encodeURIComponent(since)}` : "";
        const response = await fetch(`/api/admin/appointments/recent${query}`, { cache: "no-store" });
        if (!response.ok) return null;
        const result = await response.json() as {
          checkedAt?: string;
          appointments?: NewAppointment[];
        };
        if (!result.checkedAt || !Array.isArray(result.appointments)) return null;
        return { checkedAt: result.checkedAt, appointments: result.appointments };
      } catch {
        return null;
      }
    }

    function enqueueAppointments(items: NewAppointment[]) {
      const found = items.filter((item) => {
        if (seenIdsRef.current.has(item.id)) return false;
        seenIdsRef.current.add(item.id);
        return true;
      });
      if (!found.length || !active) return;

      setQueue((current) => [...current, ...found]);
      onNewAppointmentRef.current?.();
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play().then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
      }
    }

    async function fetchAppointment(id: string) {
      if (!active || seenIdsRef.current.has(id)) return;
      try {
        const response = await fetch(`/api/admin/appointments/recent?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json() as { appointment?: NewAppointment };
        if (active && result.appointment) enqueueAppointments([result.appointment]);
      } catch {
        // A reconnect catch-up will retry missed inserts.
      }
    }

    async function syncRecent() {
      if (!active || !lastCheckedAtRef.current) return;
      if (syncing) {
        syncAgain = true;
        return;
      }

      syncing = true;
      try {
        const result = await fetchRecent(lastCheckedAtRef.current);
        if (!active || !result) return;
        enqueueAppointments(result.appointments);
        lastCheckedAtRef.current = result.checkedAt;
      } finally {
        syncing = false;
        if (active && syncAgain) {
          syncAgain = false;
          void syncRecent();
        }
      }
    }

    async function startSubscription() {
      const initial = await fetchRecent();
      if (!active) return;

      const initialCursor = initial?.checkedAt || new Date().toISOString();
      lastCheckedAtRef.current = initialCursor;
      initial?.appointments.forEach((item) => {
        if (new Date(item.createdAt).getTime() <= new Date(initialCursor).getTime()) {
          seenIdsRef.current.add(item.id);
        }
      });

      channel = supabase
        .channel("dashboard-new-appointments")
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "agendamentos",
        }, (payload) => {
          const id = payload.new.id;
          if (typeof id === "string") void fetchAppointment(id);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void syncRecent();
        });
    }

    void startSubscription();
    const recoveryInterval = window.setInterval(() => void syncRecent(), 15_000);
    return () => {
      active = false;
      window.clearInterval(recoveryInterval);
      if (channel) void supabase.removeChannel(channel);
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
