"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, Clock3, RefreshCw, X } from "lucide-react";
import MobileTabBar from "../../mobile-tab-bar";
import { formatPrice } from "../../services";
import styles from "../booking.module.css";

type AppointmentStatus = "pendente" | "confirmado" | "em_andamento" | "concluido" | "cancelado";
type Appointment = {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  vehicle: string;
  plate: string;
  amount: number;
  status: AppointmentStatus;
};
type Credential = { id: string; token: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} de ${shortMonths[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function statusDetails(status: AppointmentStatus) {
  switch (status) {
    case "confirmado":
      return { title: "Agendamento confirmado", label: "Confirmado pela unidade", message: "A unidade confirmou seu horário." };
    case "em_andamento":
      return { title: "Serviço em andamento", label: "Atendimento iniciado", message: "Seu veículo já está sendo atendido pela equipe." };
    case "concluido":
      return { title: "Serviço concluído", label: "Atendimento finalizado", message: "O atendimento foi finalizado. Obrigado por escolher a Auto CT!" };
    case "cancelado":
      return { title: "Agendamento cancelado", label: "Cancelado", message: "Entre em contato com a unidade se precisar de ajuda." };
    default:
      return { title: "Solicitação enviada", label: "Aguardando confirmação", message: "A unidade recebeu seu pedido. O status será atualizado quando a equipe confirmar ou iniciar o atendimento." };
  }
}

export default function BookingStatusPage() {
  const [bookingId, setBookingId] = useState("");
  const [token, setToken] = useState("");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    if (!UUID.test(id)) {
      setError("Não encontramos o código deste agendamento. Abra o link recebido após enviar a solicitação.");
      setLoading(false);
      return;
    }

    setBookingId(id);
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem("auto-ct-booking-tokens") ?? "[]");
      const credentials = Array.isArray(stored) ? stored as Credential[] : [];
      const credential = credentials.find((item) => item?.id === id && typeof item.token === "string");
      if (!credential) {
        setError("Não encontramos os dados de acesso deste agendamento neste aparelho.");
        setLoading(false);
        return;
      }
      setToken(credential.token);
    } catch {
      setError("Não foi possível acessar os dados salvos deste agendamento.");
      setLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async (showIndicator = false) => {
    if (!bookingId || !token || requestInFlight.current) return;
    requestInFlight.current = true;
    if (showIndicator) setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/app/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ bookings: [{ id: bookingId, token }] }),
      });
      const result = await response.json() as { appointments?: Appointment[]; message?: string };
      if (!response.ok) throw new Error(result.message || "Não foi possível consultar o status agora.");
      const current = result.appointments?.find((item) => item.id === bookingId);
      if (!current) throw new Error("Este agendamento não foi encontrado. Confira em Meus agendamentos.");
      setAppointment(current);
      setLastCheckedAt(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o status agora.");
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId, token]);

  useEffect(() => {
    if (!bookingId || !token || appointment?.status === "concluido" || appointment?.status === "cancelado") return;
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 15_000);
    return () => window.clearInterval(interval);
  }, [appointment?.status, bookingId, token, refreshStatus]);

  const status = appointment?.status ?? "pendente";
  const details = statusDetails(status);
  const currentStep = status === "pendente" ? 1 : status === "confirmado" ? 2 : status === "em_andamento" ? 3 : status === "concluido" ? 5 : 2;

  return (
    <div className={styles.canvas}>
      <main className={styles.app}>
        <header className={styles.header}>
          <Link href="/aplicativo/agendamento" aria-label="Voltar para agendamento"><ChevronLeft /></Link>
          <h1>Meu agendamento</h1>
          <button className={styles.statusRefresh} type="button" onClick={() => void refreshStatus(true)} disabled={!bookingId || !token || refreshing} aria-label="Atualizar status">
            <RefreshCw className={refreshing ? styles.statusRefreshing : ""} aria-hidden="true" />
          </button>
        </header>
        <span className={styles.headerUnderline} aria-hidden="true" />

        <div className={styles.content}>
          <section className={styles.statusScreen} aria-live="polite" aria-labelledby="booking-status-title">
            <span className={`${styles.statusIcon} ${status === "cancelado" ? styles.statusIconCancelled : ""}`}>
              {loading ? <RefreshCw aria-hidden="true" /> : status === "pendente" || status === "em_andamento" ? <Clock3 aria-hidden="true" /> : status === "cancelado" ? <X aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
            </span>
            <span className={styles.statusEyebrow}>Acompanhamento do pedido</span>
            <h2 id="booking-status-title">{loading ? "Consultando solicitação" : appointment ? details.title : "Status do agendamento"}</h2>
            {appointment && <span className={`${styles.statusChip} ${status === "cancelado" ? styles.statusChipCancelled : ""}`}>{details.label}</span>}
            <p className={styles.statusMessage}>{appointment ? details.message : loading ? "Estamos buscando os dados do agendamento." : error || "Consulte novamente em instantes."}</p>

            {appointment && (
              <>
                <div className={styles.statusProgress}>
                  <div className={styles.statusProgressLine} />
                  {[
                    { step: 1, title: "Solicitação enviada", subtitle: "Recebida pela unidade" },
                    { step: 2, title: "Agendamento confirmado", subtitle: "Data e horário confirmados" },
                    { step: 3, title: "Em andamento", subtitle: "Atendimento iniciado" },
                    { step: 4, title: "Concluído", subtitle: "Atendimento finalizado" },
                  ].map(({ step, title, subtitle }) => {
                    const cancelledStep = status === "cancelado" && step === 2;
                    const stepClass = cancelledStep
                      ? styles.statusStepCancelled
                      : step < currentStep ? styles.statusStepDone : step === currentStep ? styles.statusStepCurrent : styles.statusStepMuted;
                    return (
                      <div key={step} className={`${styles.statusStep} ${stepClass}`}>
                        <span>{cancelledStep ? <X aria-hidden="true" /> : step < currentStep ? <CheckCircle2 aria-hidden="true" /> : step === currentStep ? <Clock3 aria-hidden="true" /> : <span className={styles.statusStepNumber}>{step}</span>}</span>
                        <div><strong>{cancelledStep ? "Cancelado" : title}</strong><small>{cancelledStep ? "Fale com a unidade para mais informações" : subtitle}</small></div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.statusSummary}>
                  <div><span>Serviço</span><strong>{appointment.serviceName}</strong></div>
                  <div><span>Data e horário</span><strong>{formatDate(appointment.date)} · {appointment.time}</strong></div>
                  <div><span>Veículo</span><strong>{appointment.vehicle}{appointment.plate ? ` · ${appointment.plate}` : ""}</strong></div>
                  <div><span>Valor</span><strong>{formatPrice(appointment.amount)}</strong></div>
                </div>
              </>
            )}

            {error && appointment && <p className={styles.statusError} role="alert">{error}</p>}
            <p className={styles.statusAutoUpdate}>
              {!bookingId || !token
                ? "O acompanhamento usa os dados salvos neste aparelho."
                : lastCheckedAt
                  ? `Última consulta às ${lastCheckedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Atualizamos automaticamente a cada 15 segundos.`
                  : "Atualizamos automaticamente a cada 15 segundos."}
            </p>
            <div className={styles.statusActions}>
              <button className={styles.statusProfileLink} type="button" onClick={() => void refreshStatus(true)} disabled={!bookingId || !token || refreshing}>
                {refreshing ? "Atualizando..." : "Atualizar status agora"}
              </button>
              <Link href="/aplicativo/usuario" className={styles.statusBackLink}>Meus agendamentos</Link>
              <Link href="/aplicativo" className={styles.statusBackLink}>Voltar aos serviços</Link>
            </div>
          </section>
        </div>
        <MobileTabBar active="booking" />
      </main>
    </div>
  );
}
