"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Droplets,
  House,
  Package,
  Play,
  Settings,
  Tag,
  Wrench,
} from "lucide-react";
import styles from "./dashboard.module.css";
import DashboardActions from "./dashboard-actions";
import AppointmentNotification from "./appointment-notification";

type Period = "Hoje" | "Semana" | "Mês";
type AppointmentStatus = "pending" | "progress" | "done";

type Appointment = {
  id: string;
  time: string;
  customer: string;
  vehicle: string;
  service: string;
  status: AppointmentStatus;
  kind: "wash" | "maintenance";
};

const periods: Period[] = ["Hoje", "Semana", "Mês"];
type RevenuePoint = { label: string; amount: number };
type Metrics = {
  revenue: number;
  appointments: number;
  completed: number;
  ticket: number;
  trends: [string, string, string, string];
  comparison: string;
};

const zeroMetrics: Metrics = {
  revenue: 0,
  appointments: 0,
  completed: 0,
  ticket: 0,
  trends: ["0%", "0%", "0%", "0%"],
  comparison: "em relação ao período anterior",
};
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

function RevenueChart({ period, revenue, trend, series }: { period: Period; revenue: number; trend: string; series: RevenuePoint[] }) {
  const labels = series.length
    ? series.map((point) => ({
        ...point,
        amount: Number.isFinite(point.amount) ? Math.max(0, point.amount) : 0,
      }))
    : [{ label: "—", amount: 0 }];
  const maximum = Math.max(...labels.map((point) => point.amount), 0);
  const points = labels.map((point, index) => ({
    x: labels.length > 1 ? 44 + (512 / (labels.length - 1)) * index : 300,
    y: 264 - (maximum > 0 ? point.amount / maximum : 0) * 220,
  }));
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const area = `${line} L ${points[points.length - 1].x} 264 L ${points[0].x} 264 Z`;

  const title = period === "Hoje" ? "Faturamento de Hoje" : period === "Semana" ? "Faturamento da Semana" : "Faturamento do Mês";
  const yLabels = [1, 0.75, 0.5, 0.25, 0].map((factor) => compactMoney.format(maximum * factor));

  return (
    <section className={`${styles.panel} ${styles.chartPanel}`} aria-labelledby="revenue-title">
      <div className={styles.panelHeading}>
        <div className={styles.panelTitle}>
          <ChartNoAxesColumnIncreasing aria-hidden="true" />
          <h2 id="revenue-title">{title}</h2>
        </div>
        <div className={styles.revenueBadge}><strong>{money.format(revenue)}</strong><span>{trend}</span></div>
      </div>

      <div className={styles.chartWrap}>
        <div className={styles.yAxis} aria-hidden="true">
          {yLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
        </div>
        <svg className={styles.chart} viewBox="0 0 580 300" role="img" aria-label={`${title}: ${money.format(revenue)}, variação de ${trend}`}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a7ed00" stopOpacity=".62" />
              <stop offset="100%" stopColor="#6ca900" stopOpacity=".02" />
            </linearGradient>
            <filter id="revenue-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {yLabels.map((_, index) => {
            const y = 44 + (220 / (yLabels.length - 1)) * index;
            return <line key={index} x1="44" y1={y} x2="556" y2={y} className={styles.gridLine} />;
          })}
          <path d={area} fill="url(#revenue-fill)" />
          <path d={line} className={styles.chartLine} filter="url(#revenue-glow)" />
          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={index === points.length - 1 ? 6 : 4.5} className={styles.chartPoint} />
          ))}
          {labels.map(({ label }, index) => (
            <text key={`${label}-${index}`} x={points[index].x} y="288" textAnchor="middle" className={styles.xLabel}>{label}</text>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("Semana");
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>("progress");
  const [metrics, setMetrics] = useState<Metrics>(zeroMetrics);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<AppointmentStatus, number>>({ pending: 0, progress: 0, done: 0 });
  const [companyName, setCompanyName] = useState("Auto CT");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      setIsLoading(true);
      setApiError("");
      try {
        const response = await fetch(`/api/admin/overview?period=${encodeURIComponent(period)}`, { cache: "no-store" });
        const result = await response.json() as {
          companyName?: string;
          metrics?: Metrics;
          revenueSeries?: RevenuePoint[];
          appointments?: Appointment[];
          appointmentCounts?: Record<AppointmentStatus, number>;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar o painel.");
        if (!active) return;
        setCompanyName(result.companyName || "Auto CT");
        setMetrics(result.metrics ?? zeroMetrics);
        setRevenueSeries(result.revenueSeries ?? []);
        setAppointments(result.appointments ?? []);
        setAppointmentCounts(result.appointmentCounts ?? { pending: 0, progress: 0, done: 0 });
      } catch (error) {
        if (active) setApiError(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadOverview();
    return () => { active = false; };
  }, [period, reloadKey]);

  const selectedMetrics = metrics;
  const visibleAppointments = appointments.filter((appointment) => appointment.status === appointmentStatus);
  const appointmentTabs: { id: AppointmentStatus; label: string; count: number; Icon: typeof Clock3 }[] = [
    { id: "pending", label: "Pendente", count: appointmentCounts.pending, Icon: Clock3 },
    { id: "progress", label: "Em andamento", count: appointmentCounts.progress, Icon: Play },
    { id: "done", label: "Concluído", count: appointmentCounts.done, Icon: CheckCircle2 },
  ];

  async function completeAppointment(id: string) {
    setApiError("");
    try {
      const response = await fetch("/api/admin/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "concluido" }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o agendamento.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível atualizar o agendamento.");
    }
  }

  return (
    <div className={styles.dashboard}>
      <AppointmentNotification />
      <div className={styles.honeycombTop} aria-hidden="true" />
      <div className={styles.honeycombBottom} aria-hidden="true" />

      <aside className={styles.sidebar} aria-label="Navegação principal">
        <nav className={styles.navigation}>
          <a href="#visao-geral" className={`${styles.navItem} ${styles.navActive}`} aria-label="Visão geral" aria-current="page"><House /></a>
          <a href="/dashboard/produtos" className={styles.navItem} aria-label="Produtos"><Package /></a>
          <a href="/dashboard/servicos" className={styles.navItem} aria-label="Serviços"><Wrench /></a>
          <a href="/dashboard/configuracao" className={styles.navItem} aria-label="Configurações"><Settings /></a>
        </nav>
      </aside>

      <main className={styles.main} id="visao-geral">
        <div className={styles.content}>
          <header className={styles.topbar}>
            <a className={styles.logoLink} href="#visao-geral" aria-label="Auto CT, visão geral">
              <Image
                src="/assets/Auto%20CT%20transparent%20logo-2.webp"
                alt="Auto CT Auto Center"
                width={420}
                height={210}
                priority
                className={styles.logo}
                style={{ width: "100%", height: "auto" }}
              />
            </a>

            <div className={styles.topActions}>
              <DashboardActions />
              <div className={styles.menuAnchor}>
                <div className={styles.branchButton}>
                  <Building2 className={styles.branchIcon} />
                  <span>{companyName}</span>
                </div>
              </div>
            </div>
          </header>

          <section className={styles.pageHeading} aria-labelledby="page-title">
            <div>
              <h1 id="page-title">Visão Geral</h1>
              <span className={styles.titleUnderline} />
            </div>
            <div className={styles.periodPicker} role="group" aria-label="Período do painel">
              {periods.map((item) => (
                <button key={item} type="button" className={period === item ? styles.periodActive : ""} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>
              ))}
            </div>
          </section>

          {apiError && <p className={styles.dashboardError} role="alert">{apiError}</p>}
          {isLoading && <p className={styles.dashboardLoading} role="status">Carregando informações...</p>}

          <section className={styles.metrics} aria-label={`Indicadores de ${period.toLowerCase()}`}>
            <article className={`${styles.metricCard} ${styles.metricFeatured}`}>
              <Coins className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Faturamento</span>
                <strong>{money.format(selectedMetrics.revenue)}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[0]}</b> {selectedMetrics.comparison}</small>
              </div>
            </article>
            <article className={styles.metricCard}>
              <CalendarDays className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Total de Agendamentos</span>
                <strong>{selectedMetrics.appointments}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[1]}</b></small>
              </div>
            </article>
            <article className={styles.metricCard}>
              <CheckCircle2 className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Serviços Concluídos</span>
                <strong>{selectedMetrics.completed}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[2]}</b></small>
              </div>
            </article>
            <article className={styles.metricCard}>
              <Tag className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Ticket Médio</span>
                <strong>{money.format(selectedMetrics.ticket)}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[3]}</b></small>
              </div>
            </article>
          </section>

          <div className={styles.lowerGrid}>
            <RevenueChart period={period} revenue={selectedMetrics.revenue} trend={selectedMetrics.trends[0]} series={revenueSeries} />

            <section className={`${styles.panel} ${styles.agendaPanel}`} id="agendamentos" aria-labelledby="appointments-title">
              <div className={styles.panelHeading}>
                <div className={styles.panelTitle}>
                  <CalendarDays aria-hidden="true" />
                  <h2 id="appointments-title">Agendamentos</h2>
                </div>
                <a className={styles.agendaLink} href="#agendamentos"><span>Ver agenda</span><ArrowRight aria-hidden="true" /></a>
              </div>

              <div className={styles.appointmentTabs} role="tablist" aria-label="Filtrar agendamentos">
                {appointmentTabs.map(({ id, label, count, Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={appointmentStatus === id} className={appointmentStatus === id ? styles.appointmentTabActive : styles.appointmentTab} onClick={() => setAppointmentStatus(id)}>
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    <b>{count}</b>
                  </button>
                ))}
              </div>

              <div className={styles.appointmentScroller}>
                <div className={styles.appointmentList} role="tabpanel">
                  {visibleAppointments.map((appointment, index) => (
                    <article className={styles.appointmentRow} key={appointment.id}>
                      <div className={styles.appointmentTime}>
                        <span className={styles.playCircle}>{appointment.status === "done" ? <Check /> : <Play />}</span>
                        <strong>{appointment.time}</strong>
                      </div>
                      <div className={styles.customerInfo}><strong>{appointment.customer}</strong><span>{appointment.vehicle}</span></div>
                      <span className={styles.servicePill}>{appointment.kind === "wash" ? <Droplets aria-hidden="true" /> : <Wrench aria-hidden="true" />}{appointment.service}</span>
                      {appointment.status === "done" ? (
                        <span className={styles.doneLabel}><Check />Concluído</span>
                      ) : (
                        <button type="button" className={index === 0 ? styles.completePrimary : styles.completeButton} onClick={() => completeAppointment(appointment.id)}>
                          Concluir<Check aria-hidden="true" />
                        </button>
                      )}
                    </article>
                  ))}
                  {visibleAppointments.length === 0 && <p className={styles.emptyAppointments}>{isLoading ? "Carregando agendamentos..." : "Nenhum agendamento nesta categoria."}</p>}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
