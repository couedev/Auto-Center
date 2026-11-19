"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
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
import PwaInstallPrompt from "../pwa-install-prompt";

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

function AnimatedMoney({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, value) : 0;
    const startValue = currentValueRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || startValue === target) {
      currentValueRef.current = target;
      setDisplayValue(target);
      return;
    }

    const duration = 700;
    let startedAt = 0;
    let frame = 0;
    const animate = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (target - startValue) * easedProgress;
      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
      else currentValueRef.current = target;
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  const formattedTarget = money.format(Number.isFinite(value) ? Math.max(0, value) : 0);
  return <strong className={className} aria-label={formattedTarget}>{money.format(displayValue)}</strong>;
}

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
  const chartAnimationKey = `${period}-${labels.map((point) => point.amount).join("-")}`;
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
        <div className={styles.revenueBadge}><AnimatedMoney value={revenue} /><span>{trend}</span></div>
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
          <path key={`${chartAnimationKey}-area`} d={area} fill="url(#revenue-fill)" className={styles.chartArea} />
          <path
            key={`${chartAnimationKey}-line`}
            d={line}
            className={styles.chartLine}
            filter="url(#revenue-glow)"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1}
          />
          {points.map((point, index) => (
            <circle key={`${chartAnimationKey}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 6 : 4.5} className={styles.chartPoint} style={{ animationDelay: `${index * 35}ms` }} />
          ))}
          {labels.map(({ label }, index) => (
            <text key={`${label}-${index}`} x={points[index].x} y="288" textAnchor="middle" className={styles.xLabel}>{label}</text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  const metricCards = [0, 1, 2, 3];
  const bars = [34, 62, 46, 76, 56, 88, 68];
  const rows = [0, 1, 2];

  return (
    <div className={styles.skeletonPage}>
      <p className={styles.srOnly} role="status">Carregando informações do painel...</p>
      <section className={styles.metrics} aria-hidden="true">
        {metricCards.map((item) => (
          <article key={item} className={`${styles.metricCard} ${item === 0 ? styles.metricFeatured : ""}`}>
            <span className={`${styles.skeletonBlock} ${styles.skeletonIcon}`} />
            <div className={styles.metricContent}>
              <span className={`${styles.skeletonBlock} ${styles.skeletonLabel}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonValue}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
            </div>
          </article>
        ))}
      </section>

      <div className={styles.lowerGrid} aria-hidden="true">
        <section className={`${styles.panel} ${styles.chartPanel} ${styles.skeletonChartPanel}`}>
          <div className={styles.panelHeading}>
            <div className={styles.panelTitle}>
              <span className={`${styles.skeletonBlock} ${styles.skeletonTitleIcon}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonChartTitle}`} />
            </div>
            <span className={`${styles.skeletonBlock} ${styles.skeletonRevenue}`} />
          </div>
          <div className={styles.chartWrap}>
            <div className={styles.skeletonYAxis}>
              {rows.concat([3, 4]).map((item) => <span key={item} className={styles.skeletonBlock} />)}
            </div>
            <div className={styles.skeletonPlot}>
              <div className={styles.skeletonBars}>
                {bars.map((height, index) => <span key={index} className={styles.skeletonBlock} style={{ height: `${height}%` }} />)}
              </div>
              <div className={styles.skeletonAxisLabels}>
                {bars.map((_, index) => <span key={index} className={styles.skeletonBlock} />)}
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.agendaPanel} ${styles.skeletonAgendaPanel}`}>
          <div className={styles.panelHeading}>
            <div className={styles.panelTitle}>
              <span className={`${styles.skeletonBlock} ${styles.skeletonTitleIcon}`} />
              <span className={`${styles.skeletonBlock} ${styles.skeletonAgendaTitle}`} />
            </div>
            <span className={`${styles.skeletonBlock} ${styles.skeletonAgendaLink}`} />
          </div>
          <div className={styles.appointmentTabs}>
            {rows.map((item) => <span key={item} className={`${styles.skeletonBlock} ${styles.skeletonTab}`} />)}
          </div>
          <div className={styles.appointmentScroller}>
            <div className={styles.appointmentList}>
              {rows.map((item) => (
                <article key={item} className={styles.appointmentRow}>
                  <div className={`${styles.appointmentTime} ${styles.skeletonAppointmentTime}`}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonAppointmentIcon}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonTime}`} />
                  </div>
                  <div className={styles.skeletonCustomer}>
                    <span className={`${styles.skeletonBlock} ${styles.skeletonCustomerName}`} />
                    <span className={`${styles.skeletonBlock} ${styles.skeletonVehicle}`} />
                  </div>
                  <span className={`${styles.skeletonBlock} ${styles.skeletonService}`} />
                  <span className={`${styles.skeletonBlock} ${styles.skeletonAction}`} />
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("Semana");
  const [displayedPeriod, setDisplayedPeriod] = useState<Period>("Semana");
  const [loadingPeriod, setLoadingPeriod] = useState<Period | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>("pending");
  const [metrics, setMetrics] = useState<Metrics>(zeroMetrics);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentCounts, setAppointmentCounts] = useState<Record<AppointmentStatus, number>>({ pending: 0, progress: 0, done: 0 });
  const [companyName, setCompanyName] = useState("Auto CT");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const loadOverview = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    try {
      const response = await fetch(`/api/admin/overview?period=${encodeURIComponent(period)}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json() as {
        companyName?: string;
        metrics?: Metrics;
        revenueSeries?: RevenuePoint[];
        appointments?: Appointment[];
        appointmentCounts?: Record<AppointmentStatus, number>;
        message?: string;
      };
      if (!response.ok) throw new Error(result.message || "Não foi possível carregar o painel.");
      if (requestId !== requestIdRef.current) return;
      setCompanyName(result.companyName || "Auto CT");
      setMetrics(result.metrics ?? zeroMetrics);
      setRevenueSeries(result.revenueSeries ?? []);
      setDisplayedPeriod(period);
      setApiError("");
      setAppointments(result.appointments ?? []);
      setAppointmentCounts(result.appointmentCounts ?? { pending: 0, progress: 0, done: 0 });
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setApiError(error instanceof Error ? error.message : "Não foi possível carregar o painel.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestControllerRef.current = null;
        setIsLoading(false);
        setLoadingPeriod(null);
      }
    }
  }, [period]);
  const loadOverviewRef = useRef(loadOverview);
  useEffect(() => { loadOverviewRef.current = loadOverview; }, [loadOverview]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadOverview(); });
    return () => {
      active = false;
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [loadOverview]);

  const handleNewAppointment = useCallback(() => {
    setAppointmentStatus("pending");
    setApiError("");
    void loadOverview();
  }, [loadOverview]);

  function selectPeriod(nextPeriod: Period) {
    if (nextPeriod === period) {
      if (nextPeriod !== displayedPeriod && !loadingPeriod) {
        setApiError("");
        setLoadingPeriod(nextPeriod);
        void loadOverview();
      }
      return;
    }
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setApiError("");
    setLoadingPeriod(nextPeriod);
    setPeriod(nextPeriod);
  }

  const selectedMetrics = metrics;
  const visibleAppointments = appointments.filter((appointment) => appointment.status === appointmentStatus);
  const appointmentTabs: { id: AppointmentStatus; label: string; count: number; Icon: typeof Clock3 }[] = [
    { id: "pending", label: "Solicitações", count: appointmentCounts.pending, Icon: Clock3 },
    { id: "progress", label: "Em andamento", count: appointmentCounts.progress, Icon: Play },
    { id: "done", label: "Concluído", count: appointmentCounts.done, Icon: CheckCircle2 },
  ];

  async function updateAppointmentStatus(id: string, status: "em_andamento" | "concluido") {
    if (updatingAppointmentId) return;
    setUpdatingAppointmentId(id);
    setApiError("");
    try {
      const response = await fetch("/api/admin/overview", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Não foi possível atualizar o agendamento.");

      const previousStatus: AppointmentStatus = status === "em_andamento" ? "pending" : "progress";
      const nextStatus: AppointmentStatus = status === "em_andamento" ? "progress" : "done";
      setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status: nextStatus } : appointment));
      setAppointmentCounts((current) => ({
        ...current,
        [previousStatus]: Math.max(0, current[previousStatus] - 1),
        [nextStatus]: current[nextStatus] + 1,
      }));
      setAppointmentStatus(nextStatus);
      await loadOverviewRef.current();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Não foi possível atualizar o agendamento.");
    } finally {
      setUpdatingAppointmentId(null);
    }
  }

  return (
    <div className={styles.dashboard}>
      <PwaInstallPrompt kind="admin" />
      <AppointmentNotification onNewAppointment={handleNewAppointment} />
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

      <main className={styles.main} id="visao-geral" aria-busy={isLoading}>
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
            <div className={styles.periodPickerWrap}>
              <div className={styles.periodPicker} role="group" aria-label="Período do painel">
                {periods.map((item) => (
                  <button key={item} type="button" className={period === item ? styles.periodActive : ""} aria-pressed={period === item} onClick={() => selectPeriod(item)}>{item}</button>
                ))}
              </div>
              {loadingPeriod && <span className={styles.periodLoading} role="status">Atualizando {loadingPeriod.toLowerCase()}...</span>}
            </div>
          </section>

          {apiError && <p className={styles.dashboardError} role="alert">{apiError}</p>}
          {isLoading ? <DashboardSkeleton /> : <>

          <section className={styles.metrics} aria-label={`Indicadores de ${displayedPeriod.toLowerCase()}`}>
            <article className={`${styles.metricCard} ${styles.metricFeatured}`}>
              <Coins className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Faturamento</span>
                <AnimatedMoney value={selectedMetrics.revenue} />
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
            <RevenueChart period={displayedPeriod} revenue={selectedMetrics.revenue} trend={selectedMetrics.trends[0]} series={revenueSeries} />

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
                        <button
                          type="button"
                          className={index === 0 ? styles.completePrimary : styles.completeButton}
                          disabled={updatingAppointmentId !== null}
                          onClick={() => updateAppointmentStatus(appointment.id, appointment.status === "pending" ? "em_andamento" : "concluido")}
                        >
                          {updatingAppointmentId === appointment.id ? "Salvando..." : appointment.status === "pending" ? "Iniciar" : "Concluir"}
                          {updatingAppointmentId === appointment.id ? <Clock3 aria-hidden="true" /> : appointment.status === "pending" ? <Play aria-hidden="true" /> : <Check aria-hidden="true" />}
                        </button>
                      )}
                    </article>
                  ))}
                  {visibleAppointments.length === 0 && <p className={styles.emptyAppointments}>Nenhum agendamento nesta categoria.</p>}
                </div>
              </div>
            </section>
          </div>
          </>}
        </div>
      </main>
    </div>
  );
}
