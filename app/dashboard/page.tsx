"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  ChevronDown,
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

type Period = "Hoje" | "Semana" | "Mês";
type AppointmentStatus = "pending" | "progress" | "done";

type Appointment = {
  id: number;
  time: string;
  customer: string;
  vehicle: string;
  service: string;
  status: AppointmentStatus;
  kind: "wash" | "maintenance";
};

const initialAppointments: Appointment[] = [
  { id: 1, time: "09:00", customer: "João Silva", vehicle: "Toyota Corolla", service: "Lavagem Completa", status: "progress", kind: "wash" },
  { id: 2, time: "10:30", customer: "Marcos Oliveira", vehicle: "Hyundai HB20", service: "Revisão Básica", status: "progress", kind: "maintenance" },
  { id: 3, time: "11:30", customer: "Fernanda Costa", vehicle: "Jeep Compass", service: "Lavagem + Higienização", status: "progress", kind: "wash" },
  { id: 4, time: "12:15", customer: "Ana Beatriz", vehicle: "Honda HR-V", service: "Lavagem Completa", status: "pending", kind: "wash" },
  { id: 5, time: "13:00", customer: "Lucas Ferreira", vehicle: "VW T-Cross", service: "Revisão Básica", status: "pending", kind: "maintenance" },
  { id: 6, time: "14:30", customer: "Paula Martins", vehicle: "Chevrolet Onix", service: "Lavagem Simples", status: "pending", kind: "wash" },
  { id: 7, time: "08:00", customer: "Ricardo Nunes", vehicle: "Honda Civic", service: "Polimento", status: "done", kind: "maintenance" },
  { id: 8, time: "08:30", customer: "Carla Mendes", vehicle: "Fiat Pulse", service: "Lavagem Completa", status: "done", kind: "wash" },
  { id: 9, time: "08:45", customer: "André Rocha", vehicle: "Toyota Yaris", service: "Higienização", status: "done", kind: "wash" },
];

const periods: Period[] = ["Hoje", "Semana", "Mês"];
const periodMetrics: Record<Period, { revenue: string; appointments: number; completed: number; ticket: string; trends: [string, string, string, string]; comparison: string }> = {
  Hoje: { revenue: "R$ 3.240,00", appointments: 8, completed: 5, ticket: "R$ 648,00", trends: ["+8,4%", "+14,3%", "+25,0%", "+4,2%"], comparison: "em relação a ontem" },
  Semana: { revenue: "R$ 20.847,00", appointments: 36, completed: 28, ticket: "R$ 744,54", trends: ["+12,4%", "+20,0%", "+16,7%", "+8,9%"], comparison: "em relação à semana anterior" },
  Mês: { revenue: "R$ 83.210,00", appointments: 142, completed: 116, ticket: "R$ 716,00", trends: ["+18,2%", "+14,5%", "+17,1%", "+6,8%"], comparison: "em relação ao mês anterior" },
};

function RevenueChart({ period }: { period: Period }) {
  const chart = {
    Hoje: {
      title: "Faturamento de Hoje",
      amount: "R$ 3.240,00",
      change: "+8,4%",
      labels: ["08h", "09h", "10h", "11h", "12h", "13h", "14h"],
      values: [0.24, 0.4, 0.57, 0.49, 0.68, 0.78, 0.92],
      yLabels: ["R$ 0", "R$ 800", "R$ 1.600", "R$ 2.400", "R$ 3.200"],
    },
    Semana: {
      title: "Faturamento da Semana",
      amount: "R$ 20.847,00",
      change: "+12,4%",
      labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
      values: [0.3, 0.48, 0.61, 0.53, 0.63, 0.83, 0.9],
      yLabels: ["R$ 0", "R$ 4.000", "R$ 8.000", "R$ 12.000", "R$ 16.000", "R$ 20.000", "R$ 24.000"],
    },
    Mês: {
      title: "Faturamento do Mês",
      amount: "R$ 83.210,00",
      change: "+18,2%",
      labels: ["1–5", "6–10", "11–15", "16–20", "21–25", "26–30"],
      values: [0.24, 0.39, 0.34, 0.63, 0.7, 0.91],
      yLabels: ["R$ 0", "R$ 20.000", "R$ 40.000", "R$ 60.000", "R$ 80.000", "R$ 100.000"],
    },
  }[period];

  const points = chart.values.map((value, index) => ({
    x: 44 + (512 / (chart.values.length - 1)) * index,
    y: 264 - value * 220,
  }));
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const area = `${line} L ${points[points.length - 1].x} 264 L ${points[0].x} 264 Z`;

  return (
    <section className={`${styles.panel} ${styles.chartPanel}`} aria-labelledby="revenue-title">
      <div className={styles.panelHeading}>
        <div className={styles.panelTitle}>
          <ChartNoAxesColumnIncreasing aria-hidden="true" />
          <h2 id="revenue-title">{chart.title}</h2>
        </div>
        <div className={styles.revenueBadge}><strong>{chart.amount}</strong><span>{chart.change}</span></div>
      </div>

      <div className={styles.chartWrap}>
        <div className={styles.yAxis} aria-hidden="true">
          {[...chart.yLabels].reverse().map((label) => <span key={label}>{label}</span>)}
        </div>
        <svg className={styles.chart} viewBox="0 0 580 300" role="img" aria-label={`${chart.title}: ${chart.amount}, variação de ${chart.change}`}>
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
          {chart.yLabels.map((_, index) => {
            const y = 44 + (220 / (chart.yLabels.length - 1)) * index;
            return <line key={index} x1="44" y1={y} x2="556" y2={y} className={styles.gridLine} />;
          })}
          <path d={area} fill="url(#revenue-fill)" />
          <path d={line} className={styles.chartLine} filter="url(#revenue-glow)" />
          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={index === points.length - 1 ? 6 : 4.5} className={styles.chartPoint} />
          ))}
          {chart.labels.map((label, index) => (
            <text key={label} x={points[index].x} y="288" textAnchor="middle" className={styles.xLabel}>{label}</text>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("Semana");
  const [appointmentStatus, setAppointmentStatus] = useState<AppointmentStatus>("progress");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [branch, setBranch] = useState("Auto CT - Matriz");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const selectedMetrics = periodMetrics[period];
  const completedCount = selectedMetrics.completed + appointments.filter((appointment) => appointment.status === "done").length - 3;
  const pendingCount = (period === "Semana" ? 6 : period === "Hoje" ? 3 : 26) + appointments.filter((appointment) => appointment.status === "pending").length - 3;
  const progressCount = 3 + appointments.filter((appointment) => appointment.status === "progress").length - 3;
  const visibleAppointments = appointments.filter((appointment) => appointment.status === appointmentStatus);
  const appointmentTabs: { id: AppointmentStatus; label: string; count: number; Icon: typeof Clock3 }[] = [
    { id: "pending", label: "Pendente", count: pendingCount, Icon: Clock3 },
    { id: "progress", label: "Em andamento", count: progressCount, Icon: Play },
    { id: "done", label: "Concluído", count: completedCount, Icon: CheckCircle2 },
  ];

  function completeAppointment(id: number) {
    setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status: "done" } : appointment));
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.honeycombTop} aria-hidden="true" />
      <div className={styles.honeycombBottom} aria-hidden="true" />

      <aside className={styles.sidebar} aria-label="Navegação principal">
        <nav className={styles.navigation}>
          <a href="#visao-geral" className={`${styles.navItem} ${styles.navActive}`} aria-label="Visão geral" aria-current="page"><House /></a>
          <a href="/dashboard/produtos" className={styles.navItem} aria-label="Produtos"><Package /></a>
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
              <div className={styles.menuAnchor}>
                <button className={styles.notificationButton} type="button" aria-label="Notificações" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                  <Bell />
                  <span className={styles.notificationDot} />
                </button>
                {notificationsOpen && <div className={`${styles.popover} ${styles.notificationPopover}`} role="status"><strong>Tudo em dia</strong><span>Você não tem novas notificações.</span></div>}
              </div>

              <div className={styles.menuAnchor}>
                <button className={styles.branchButton} type="button" aria-expanded={branchMenuOpen} onClick={() => setBranchMenuOpen((open) => !open)}>
                  <Building2 className={styles.branchIcon} />
                  <span>{branch}</span>
                  <ChevronDown className={styles.chevron} />
                </button>
                {branchMenuOpen && (
                  <div className={`${styles.popover} ${styles.branchPopover}`} role="menu" aria-label="Selecionar unidade">
                    {["Auto CT - Matriz", "Auto CT - Unidade Sul"].map((name) => (
                      <button key={name} type="button" role="menuitem" onClick={() => { setBranch(name); setBranchMenuOpen(false); }}>
                        <Building2 />{name}{branch === name && <Check />}
                      </button>
                    ))}
                  </div>
                )}
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

          <section className={styles.metrics} aria-label={`Indicadores de ${period.toLowerCase()}`}>
            <article className={`${styles.metricCard} ${styles.metricFeatured}`}>
              <Coins className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Faturamento</span>
                <strong>{selectedMetrics.revenue}</strong>
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
                <strong>{completedCount}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[2]}</b></small>
              </div>
            </article>
            <article className={styles.metricCard}>
              <Tag className={styles.metricIcon} aria-hidden="true" />
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>Ticket Médio</span>
                <strong>{selectedMetrics.ticket}</strong>
                <small><ArrowUpRight /> <b>{selectedMetrics.trends[3]}</b></small>
              </div>
            </article>
          </section>

          <div className={styles.lowerGrid}>
            <RevenueChart period={period} />

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
                  {visibleAppointments.length === 0 && <p className={styles.emptyAppointments}>Nenhum agendamento nesta categoria.</p>}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
