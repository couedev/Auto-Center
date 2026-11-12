"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import MobileTabBar from "../mobile-tab-bar";
import { findService } from "../services";
import styles from "./booking.module.css";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const shortMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const timeSlots = ["09:00", "10:30", "13:00", "15:30"];

function todayInFortaleza() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
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

export default function BookingPage() {
  const [now, setNow] = useState({ date: "", time: "" });
  const [service, setService] = useState(() => findService(null));
  const [selectedDate, setSelectedDate] = useState("");
  const [visibleWeekStart, setVisibleWeekStart] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>("10:30");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const current = todayInFortaleza();
      const firstDate = addDays(current.date, 1);
      setNow(current);
      setSelectedDate(firstDate);
      setVisibleWeekStart(startOfWeek(firstDate));
      try { setService(findService(window.sessionStorage.getItem("auto-ct-selected-service"))); }
      catch { setService(findService(null)); }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
          <div className={styles.content} role="status">Carregando horários disponíveis...</div>
          <MobileTabBar active="booking" />
        </main>
      </div>
    );
  }

  const dates = Array.from({ length: 7 }, (_, index) => addDays(visibleWeekStart, index));
  const canGoBack = visibleWeekStart > startOfWeek(now.date);

  function chooseDate(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setConfirmed(false);
    setError("");
  }

  function moveWeek(days: number) {
    const nextWeek = addDays(visibleWeekStart, days);
    setVisibleWeekStart(nextWeek);
    chooseDate(nextWeek < now.date ? now.date : nextWeek);
  }

  function confirmBooking() {
    if (!selectedTime) return;
    try {
      const existing = JSON.parse(window.localStorage.getItem("auto-ct-appointments") ?? "[]") as unknown;
      const appointments = Array.isArray(existing) ? existing : [];
      appointments.push({ id: `${Date.now()}`, serviceId: service.id, serviceName: service.name, price: service.price, date: selectedDate, time: selectedTime, status: "Confirmado" });
      window.localStorage.setItem("auto-ct-appointments", JSON.stringify(appointments));
      setConfirmed(true);
      setError("");
    } catch {
      setError("Não foi possível salvar o agendamento neste navegador.");
    }
  }

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
          <section className={styles.serviceCard} aria-label="Serviço escolhido">
            <div className={`${styles.serviceThumb} ${styles[service.tone]}`} aria-hidden="true"><service.Icon strokeWidth={1.6} /></div>
            <div className={styles.serviceInfo}>
              <h2>{service.name}</h2>
              <p>{service.description}</p>
              <strong>R$ {service.price}</strong>
            </div>
          </section>

          <section className={styles.dateSection} aria-labelledby="date-title">
            <div className={styles.stepHeading}>
              <span className={styles.stepNumber}>1</span>
              <h2 id="date-title">Escolha a data</h2>
              <div className={styles.monthControls}>
                <button type="button" aria-label="Semana anterior" disabled={!canGoBack} onClick={() => moveWeek(-7)}><ChevronLeft /></button>
                <span>{monthLabel(dates[3])}</span>
                <button type="button" aria-label="Próxima semana" onClick={() => moveWeek(7)}><ChevronRight /></button>
              </div>
            </div>
            <div className={styles.weekdays} aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
            <div className={styles.dates} role="group" aria-label="Datas disponíveis">
              {dates.map((date) => <button key={date} type="button" disabled={date < now.date} aria-label={dateLabel(date)} aria-pressed={selectedDate === date} className={selectedDate === date ? styles.selectedDate : ""} onClick={() => chooseDate(date)}>{asUtcDate(date).getUTCDate()}</button>)}
            </div>
          </section>

          <section className={styles.timeSection} aria-labelledby="time-title">
            <div className={styles.stepHeading}><span className={styles.stepNumber}>2</span><h2 id="time-title">Escolha o horário</h2></div>
            <div className={styles.timeSlots} role="group" aria-label="Horários disponíveis">
              {timeSlots.map((time) => <button key={time} type="button" disabled={selectedDate === now.date && time <= now.time} aria-pressed={selectedTime === time} className={selectedTime === time ? styles.selectedTime : ""} onClick={() => { setSelectedTime(time); setConfirmed(false); setError(""); }}>{time}</button>)}
            </div>
          </section>

          <section className={styles.summary} aria-label="Resumo do agendamento">
            <div><CalendarDays aria-hidden="true" /><span>Agendamento<strong>{dateLabel(selectedDate)}</strong></span></div>
            <div><Clock3 aria-hidden="true" /><span>Horário<strong>{selectedTime ?? "Selecione"}</strong></span></div>
          </section>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {confirmed && <p className={styles.confirmed} role="status"><CheckCircle2 />Agendamento confirmado!</p>}
          <button className={styles.confirmButton} type="button" disabled={!selectedTime || confirmed} onClick={confirmBooking}><CheckCircle2 aria-hidden="true" />{confirmed ? "Agendamento confirmado" : "Confirmar agendamento"}</button>
        </div>

        <MobileTabBar active="booking" />
      </main>
    </div>
  );
}
