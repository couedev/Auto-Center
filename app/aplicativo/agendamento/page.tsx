"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import MobileTabBar from "../mobile-tab-bar";
import { formatPrice, mapCatalogService } from "../services";
import type { Service } from "../services";
import TurnstileWidget from "../turnstile-widget";
import styles from "./booking.module.css";

type TimeParts = { date: string; time: string };
type Slot = { horario: string; disponivel: boolean };
type BookingForm = { name: string; phone: string; email: string; vehicle: string; plate: string };
type BookingResult = { id: string; token: string; total: number; status: string };
type WhatsAppInfo = { enabled: boolean; number: string | null };

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DEFAULT_TIME_ZONE = "America/Fortaleza";
const emptyForm: BookingForm = { name: "", phone: "", email: "", vehicle: "", plate: "" };

function zonedNow(timeZone: string): TimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

function asUtcDate(isoDate: string) { return new Date(`${isoDate}T12:00:00Z`); }
function addDays(isoDate: string, days: number) {
  const date = asUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function startOfWeek(isoDate: string) { return addDays(isoDate, -asUtcDate(isoDate).getUTCDay()); }
function monthLabel(isoDate: string) {
  const date = asUtcDate(isoDate);
  return `${monthNames[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}
function dateLabel(isoDate: string) {
  const date = asUtcDate(isoDate);
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} de ${shortMonths[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}
function isStoredProfile(value: unknown): value is Partial<BookingForm> {
  return Boolean(value && typeof value === "object");
}

export default function BookingPage() {
  const [now, setNow] = useState<TimeParts>({ date: "", time: "" });
  const [service, setService] = useState<Service | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleWeekStart, setVisibleWeekStart] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<BookingResult | null>(null);
  const [whatsapp, setWhatsapp] = useState<WhatsAppInfo>({ enabled: false, number: null });

  useEffect(() => {
    let active = true;

    async function loadAppData() {
      try {
        const response = await fetch("/api/app/catalog", { cache: "no-store" });
        const result = await response.json() as {
          services?: unknown[];
          config?: { timezone?: string };
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar os serviços.");
        const availableServices = (result.services ?? []).map(mapCatalogService).filter((item): item is Service => item !== null);
        if (!active) return;

        const zone = result.config?.timezone || DEFAULT_TIME_ZONE;
        const current = zonedNow(zone);
        let storedServiceId: string | null = null;
        try { storedServiceId = window.sessionStorage.getItem("auto-ct-selected-service"); } catch {}
        setNow(current);
        setSelectedDate(current.date);
        setVisibleWeekStart(startOfWeek(current.date));
        setService(availableServices.find((item) => item.id === storedServiceId) ?? availableServices[0] ?? null);

        try {
          const storedProfile: unknown = JSON.parse(window.localStorage.getItem("auto-ct-profile") ?? "null");
          if (isStoredProfile(storedProfile)) {
            setForm({
              name: typeof storedProfile.name === "string" ? storedProfile.name : "",
              phone: typeof storedProfile.phone === "string" ? storedProfile.phone : "",
              email: typeof storedProfile.email === "string" ? storedProfile.email : "",
              vehicle: "",
              plate: "",
            });
          }
        } catch {}
      } catch (cause) {
        if (active) setCatalogError(cause instanceof Error ? cause.message : "Não foi possível carregar o serviço.");
      }
    }

    void loadAppData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!service || !selectedDate) return;
    let active = true;
    setSlots([]);
    setSelectedTime(null);
    setSlotsLoading(true);
    setSlotsError("");

    async function loadAvailability() {
      try {
        const query = new URLSearchParams({ serviceId: service.id, date: selectedDate });
        const response = await fetch(`/api/app/availability?${query}`, { cache: "no-store" });
        const result = await response.json() as { slots?: Slot[]; message?: string };
        if (!response.ok) throw new Error(result.message || "Não foi possível consultar os horários.");
        if (active) setSlots(Array.isArray(result.slots) ? result.slots : []);
      } catch (cause) {
        if (active) setSlotsError(cause instanceof Error ? cause.message : "Não foi possível consultar os horários.");
      } finally {
        if (active) setSlotsLoading(false);
      }
    }

    void loadAvailability();
    return () => { active = false; };
  }, [service, selectedDate]);

  if (!now.date) {
    return (
      <div className={styles.canvas}>
        <main className={styles.app}>
          <header className={styles.header}>
            <Link href="/aplicativo" aria-label="Voltar para serviços"><ChevronLeft /></Link>
            <h1>Agendamento</h1>
            <span aria-hidden="true" />
          </header>
          <span className={styles.headerUnderline} aria-hidden="true" />
          <div className={styles.content} role="status">{catalogError || "Carregando serviços e horários..."}</div>
          <MobileTabBar active="booking" />
        </main>
      </div>
    );
  }

  const lastDate = addDays(now.date, 90);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(visibleWeekStart, index));
  const canGoBack = visibleWeekStart > startOfWeek(now.date);
  const canGoForward = addDays(visibleWeekStart, 7) <= lastDate;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  function updateForm(field: keyof BookingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess(null);
    setError("");
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setSuccess(null);
    setError("");
  }

  function moveWeek(days: number) {
    const nextWeek = addDays(visibleWeekStart, days);
    if (nextWeek > lastDate || nextWeek < startOfWeek(now.date)) return;
    setVisibleWeekStart(nextWeek);
    chooseDate(nextWeek < now.date ? now.date : nextWeek);
  }

  async function confirmBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !selectedTime || !selectedDate || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/app/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          name: form.name,
          phone: form.phone,
          email: form.email,
          vehicle: form.vehicle,
          plate: form.plate,
          date: selectedDate,
          time: selectedTime,
          turnstileToken,
          website: honeypot,
        }),
      });
      const result = await response.json() as {
        booking?: BookingResult;
        whatsapp?: WhatsAppInfo;
        message?: string;
      };
      if (!response.ok || !result.booking?.id || !result.booking.token) {
        throw new Error(result.message || "Não foi possível enviar o agendamento.");
      }

      try {
        window.localStorage.setItem("auto-ct-profile", JSON.stringify({ name: form.name, phone: form.phone, email: form.email }));
        const saved: unknown = JSON.parse(window.localStorage.getItem("auto-ct-booking-tokens") ?? "[]");
        const credentials = Array.isArray(saved) ? saved.filter((item) =>
          item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string" && typeof (item as { token?: unknown }).token === "string",
        ) as { id: string; token: string }[] : [];
        const next = credentials.filter((item) => item.id !== result.booking?.id);
        next.push({ id: result.booking.id, token: result.booking.token });
        window.localStorage.setItem("auto-ct-booking-tokens", JSON.stringify(next.slice(-20)));
      } catch {}

      setSuccess(result.booking);
      setWhatsapp(result.whatsapp ?? { enabled: false, number: null });
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o agendamento.");
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappDigits = whatsapp.number?.replace(/\D/g, "");
  const whatsappHref = whatsapp.enabled && whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Enviei um pedido de agendamento para ${service?.name} no dia ${dateLabel(selectedDate)} às ${selectedTime}.`)}`
    : null;

  return (
    <div className={styles.canvas}>
      <main className={styles.app}>
        <header className={styles.header}>
          <Link href="/aplicativo" aria-label="Voltar para serviços"><ChevronLeft /></Link>
          <h1>Agendamento</h1>
          <span aria-hidden="true" />
        </header>
        <span className={styles.headerUnderline} aria-hidden="true" />

        <div className={styles.content}>
          {!service ? (
            <div className={styles.emptyState} role="alert">
              <p>{catalogError || "Não há serviços ativos para agendamento."}</p>
              <Link href="/aplicativo">Voltar aos serviços</Link>
            </div>
          ) : (
            <>
              <section className={styles.serviceCard} aria-label="Serviço escolhido">
                <div className={`${styles.serviceThumb} ${styles[service.tone]}`} aria-hidden="true"><service.Icon strokeWidth={1.6} /></div>
                <div className={styles.serviceInfo}>
                  <h2>{service.name}</h2>
                  {service.description && <p>{service.description}</p>}
                  <strong>{formatPrice(service.price)}</strong>
                </div>
              </section>

              <section className={styles.dateSection} aria-labelledby="date-title">
                <div className={styles.stepHeading}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 id="date-title">Escolha a data</h2>
                  <div className={styles.monthControls}>
                    <button type="button" aria-label="Semana anterior" disabled={!canGoBack} onClick={() => moveWeek(-7)}><ChevronLeft /></button>
                    <span>{monthLabel(dates[3])}</span>
                    <button type="button" aria-label="Próxima semana" disabled={!canGoForward} onClick={() => moveWeek(7)}><ChevronRight /></button>
                  </div>
                </div>
                <div className={styles.weekdays} aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
                <div className={styles.dates} role="group" aria-label="Datas disponíveis">
                  {dates.map((date) => <button key={date} type="button" disabled={date < now.date || date > lastDate} aria-label={dateLabel(date)} aria-pressed={selectedDate === date} className={selectedDate === date ? styles.selectedDate : ""} onClick={() => chooseDate(date)}>{asUtcDate(date).getUTCDate()}</button>)}
                </div>
              </section>

              <section className={styles.timeSection} aria-labelledby="time-title">
                <div className={styles.stepHeading}><span className={styles.stepNumber}>2</span><h2 id="time-title">Escolha o horário</h2></div>
                {slotsLoading ? (
                  <p className={styles.slotMessage} role="status">Consultando horários...</p>
                ) : slotsError ? (
                  <p className={styles.inlineError} role="alert">{slotsError}</p>
                ) : slots.length ? (
                  <div className={styles.timeSlots} role="group" aria-label="Horários disponíveis">
                    {slots.map((slot) => {
                      const alreadyPassed = selectedDate === now.date && slot.horario <= now.time;
                      const disabled = !slot.disponivel || alreadyPassed;
                      return <button key={slot.horario} type="button" disabled={disabled} aria-pressed={selectedTime === slot.horario} className={selectedTime === slot.horario ? styles.selectedTime : ""} onClick={() => { setSelectedTime(slot.horario); setSuccess(null); setError(""); }}>{slot.horario}</button>;
                    })}
                  </div>
                ) : (
                  <p className={styles.slotMessage}>Não há horários disponíveis nesta data.</p>
                )}
              </section>

              <section className={styles.summary} aria-label="Resumo do agendamento">
                <div><CalendarDays aria-hidden="true" /><span>Data<strong>{dateLabel(selectedDate)}</strong></span></div>
                <div><Clock3 aria-hidden="true" /><span>Horário<strong>{selectedTime ?? "Selecione"}</strong></span></div>
              </section>

              <form className={styles.bookingForm} onSubmit={confirmBooking}>
                <div className={styles.stepHeading}><span className={styles.stepNumber}>3</span><h2>Seus dados e veículo</h2></div>
                <label>Nome completo<input autoComplete="name" maxLength={120} required value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></label>
                <label>Telefone com DDD<input type="tel" autoComplete="tel" inputMode="tel" maxLength={20} required value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="(00) 00000-0000" /></label>
                <label>E-mail <span>(opcional)</span><input type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="voce@email.com" /></label>
                <label>Veículo<input autoComplete="off" maxLength={100} required value={form.vehicle} onChange={(event) => updateForm("vehicle", event.target.value)} placeholder="Ex.: Volvo FH 540" /></label>
                <label>Placa <span>(opcional)</span><input autoComplete="off" maxLength={10} value={form.plate} onChange={(event) => updateForm("plate", event.target.value.toUpperCase())} placeholder="ABC1D23" /></label>

                <div className={styles.honeypot} aria-hidden="true"><label>Deixe este campo vazio<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></label></div>
                {siteKey && <div className={styles.turnstileArea}>
                  <div className={styles.turnstile}><TurnstileWidget siteKey={siteKey} resetKey={turnstileResetKey} onToken={setTurnstileToken} /></div>
                  {!turnstileToken && <p className={styles.captchaHint}>Conclua a verificação de segurança para enviar.</p>}
                </div>}
                {error && <p className={styles.error} role="alert">{error}</p>}
                {success && (
                  <div className={styles.confirmed} role="status">
                    <CheckCircle2 />
                    <div>
                      <strong>Solicitação enviada!</strong>
                      <span>A unidade confirmará o horário. Você pode consultar esse pedido em Meu perfil neste aparelho.</span>
                      {Number.isFinite(success.total) && <span>Valor registrado: {formatPrice(success.total)}</span>}
                    </div>
                  </div>
                )}
                {success && whatsappHref && <a className={styles.whatsappLink} href={whatsappHref} target="_blank" rel="noreferrer">Continuar pelo WhatsApp</a>}
                <button className={styles.confirmButton} type="submit" disabled={!selectedTime || submitting || Boolean(success) || slotsLoading || (Boolean(siteKey) && !turnstileToken)}>
                  <CheckCircle2 aria-hidden="true" />
                  {submitting ? "Enviando solicitação..." : success ? "Solicitação enviada" : "Confirmar agendamento"}
                </button>
              </form>
            </>
          )}
        </div>

        <MobileTabBar active="booking" />
      </main>
    </div>
  );
}
