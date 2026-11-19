import { getLocalDateTime, getPeriodRange, type DashboardPeriod } from "@/lib/dashboard/periods";
import { apiJson, getAdminContext } from "@/lib/supabase/admin";

type OrderRow = {
  id: string;
  valor_total: number | string;
  pago_em: string | null;
  agendamentos: { id: string } | { id: string }[] | null;
};
type ApprovedServiceRow = {
  data_inicio: string;
  pedidos: { id: string; valor_total: number | string } | { id: string; valor_total: number | string }[] | null;
};
type AppointmentRow = { id: string; data_inicio: string; veiculo: string; placa: string | null; status: string; pedidos: { nome_contato: string; status: string; pedido_itens: { nome_item: string }[] } | null };

const validPeriods: DashboardPeriod[] = ["Hoje", "Semana", "Mês"];

function trend(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "Novo";
  const change = ((current - previous) / previous) * 100;
  const value = `${Math.abs(change).toFixed(1).replace(".", ",")}%`;
  return change > 0 ? `+${value}` : change < 0 ? `−${value}` : value;
}

function chartBuckets(period: DashboardPeriod) {
  if (period === "Hoje") return ["00h", "04h", "08h", "12h", "16h", "20h"];
  if (period === "Semana") return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return ["1–5", "6–10", "11–15", "16–20", "21–25", "26–31"];
}

function bucketIndex(period: DashboardPeriod, date: Date, timeZone: string, localStart: { year: number; month: number; day: number }) {
  const local = getLocalDateTime(date, timeZone);
  if (period === "Hoje") return Math.min(Math.floor(local.hour / 4), 5);
  if (period === "Semana") {
    const day = Math.round((Date.UTC(local.year, local.month - 1, local.day) - Date.UTC(localStart.year, localStart.month - 1, localStart.day)) / 86_400_000);
    return Math.max(0, Math.min(day, 6));
  }
  return Math.min(Math.floor((local.day - 1) / 5), 5);
}

function getRelation(value: AppointmentRow["pedidos"] | AppointmentRow["pedidos"][]): AppointmentRow["pedidos"] {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getOrderRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getServiceRevenue(rows: ApprovedServiceRow[]) {
  return rows.reduce((sum, row) => sum + Number(getOrderRelation(row.pedidos)?.valor_total || 0), 0);
}

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  const requestedPeriod = new URL(request.url).searchParams.get("period");
  const period = validPeriods.includes(requestedPeriod as DashboardPeriod)
    ? (requestedPeriod as DashboardPeriod)
    : "Semana";

  try {
    const { data: settings, error: settingsError } = await context.supabase
      .from("configuracoes")
      .select("nome_empresa,fuso_horario")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) return apiJson({ message: "Não foi possível carregar as configurações da empresa." }, 503);
    const timeZone = settings?.fuso_horario || "America/Santarem";
    const range = getPeriodRange(period, timeZone);

    const paidOrders = (start: Date, end: Date) => context.supabase
      .from("pedidos")
      .select("id,valor_total,pago_em,agendamentos(id)")
      .eq("status_pagamento", "pago")
      .gte("pago_em", start.toISOString())
      .lt("pago_em", end.toISOString());

    const approvedServices = (start: Date, end: Date) => context.supabase
      .from("agendamentos")
      .select("data_inicio,pedidos!inner(id,valor_total)")
      .in("status", ["em_andamento", "concluido"])
      .gte("data_inicio", start.toISOString())
      .lt("data_inicio", end.toISOString());

    const appointmentCounts = (start: Date, end: Date, status?: string) => {
      let query = context.supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .gte("data_inicio", start.toISOString())
        .lt("data_inicio", end.toISOString())
        .neq("status", "cancelado");
      if (status) query = query.eq("status", status);
      return query;
    };

    const requestCounts = (orderStatus: "pendente" | "confirmado") =>
      context.supabase
        .from("agendamentos")
        .select("id,pedidos!inner(status)", { count: "exact", head: true })
        .eq("status", "pendente")
        .eq("pedidos.status", orderStatus);

    const [ordersResult, previousOrdersResult, approvedServicesResult, previousApprovedServicesResult, appointmentsResult, completedResult, progressResult, pendingRequestsResult, confirmedRequestsResult, previousAppointmentsResult, previousCompletedResult, requestsAgendaResult, progressAgendaResult, agendaResult] = await Promise.all([
      paidOrders(range.start, range.end),
      paidOrders(range.previousStart, range.previousEnd),
      approvedServices(range.start, range.end),
      approvedServices(range.previousStart, range.previousEnd),
      appointmentCounts(range.start, range.end),
      appointmentCounts(range.start, range.end, "concluido"),
      context.supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("status", "em_andamento"),
      requestCounts("pendente"),
      requestCounts("confirmado"),
      appointmentCounts(range.previousStart, range.previousEnd),
      appointmentCounts(range.previousStart, range.previousEnd, "concluido"),
      context.supabase
        .from("agendamentos")
        .select("id,data_inicio,veiculo,placa,status,pedidos!inner(nome_contato,status,pedido_itens(nome_item))")
        .eq("status", "pendente")
        .in("pedidos.status", ["pendente", "confirmado"])
        .order("criado_em", { ascending: false })
        .limit(100),
      context.supabase
        .from("agendamentos")
        .select("id,data_inicio,veiculo,placa,status,pedidos!inner(nome_contato,status,pedido_itens(nome_item))")
        .eq("status", "em_andamento")
        .order("data_inicio", { ascending: true })
        .limit(100),
      context.supabase
        .from("agendamentos")
        .select("id,data_inicio,veiculo,placa,status,pedidos!inner(nome_contato,status,pedido_itens(nome_item))")
        .gte("data_inicio", range.start.toISOString())
        .lt("data_inicio", range.end.toISOString())
        .neq("status", "cancelado")
        .order("data_inicio", { ascending: true })
        .limit(20),
    ]);

    const queryErrors = [ordersResult.error, previousOrdersResult.error, approvedServicesResult.error, previousApprovedServicesResult.error, appointmentsResult.error, completedResult.error, progressResult.error, pendingRequestsResult.error, confirmedRequestsResult.error, previousAppointmentsResult.error, previousCompletedResult.error, requestsAgendaResult.error, progressAgendaResult.error, agendaResult.error];
    if (queryErrors.some(Boolean)) {
      return apiJson({ message: "Não foi possível carregar as informações do painel. Tente novamente em instantes." }, 503);
    }

    const currentOrders = (ordersResult.data ?? []) as unknown as OrderRow[];
    const previousOrders = (previousOrdersResult.data ?? []) as unknown as OrderRow[];
    const currentApprovedServices = (approvedServicesResult.data ?? []) as unknown as ApprovedServiceRow[];
    const previousApprovedServices = (previousApprovedServicesResult.data ?? []) as unknown as ApprovedServiceRow[];
    const currentProductOrders = currentOrders.filter((order) => !getOrderRelation(order.agendamentos));
    const previousProductOrders = previousOrders.filter((order) => !getOrderRelation(order.agendamentos));
    const currentRevenue = currentProductOrders.reduce((sum, order) => sum + Number(order.valor_total || 0), 0) + getServiceRevenue(currentApprovedServices);
    const previousRevenue = previousProductOrders.reduce((sum, order) => sum + Number(order.valor_total || 0), 0) + getServiceRevenue(previousApprovedServices);
    const currentAppointments = appointmentsResult.count ?? 0;
    const previousAppointments = previousAppointmentsResult.count ?? 0;
    const currentCompleted = completedResult.count ?? 0;
    const currentProgress = progressResult.count ?? 0;
    const previousCompleted = previousCompletedResult.count ?? 0;
    const currentOrderCount = currentProductOrders.length + currentApprovedServices.length;
    const previousOrderCount = previousProductOrders.length + previousApprovedServices.length;
    const currentTicket = currentOrderCount ? currentRevenue / currentOrderCount : 0;
    const previousTicket = previousOrderCount ? previousRevenue / previousOrderCount : 0;
    const revenueSeries = chartBuckets(period).map((label) => ({ label, amount: 0 }));

    for (const order of currentProductOrders) {
      if (!order.pago_em) continue;
      const index = bucketIndex(period, new Date(order.pago_em), timeZone, range.localStart);
      revenueSeries[index].amount += Number(order.valor_total || 0);
    }

    for (const appointment of currentApprovedServices) {
      const order = getOrderRelation(appointment.pedidos);
      if (!order) continue;
      const index = bucketIndex(period, new Date(appointment.data_inicio), timeZone, range.localStart);
      revenueSeries[index].amount += Number(order.valor_total || 0);
    }

    const agendaRows = new Map<string, AppointmentRow>();
    for (const appointment of [
      ...((requestsAgendaResult.data ?? []) as unknown as AppointmentRow[]),
      ...((progressAgendaResult.data ?? []) as unknown as AppointmentRow[]),
      ...((agendaResult.data ?? []) as unknown as AppointmentRow[]),
    ]) agendaRows.set(appointment.id, appointment);

    const appointments = [...agendaRows.values()].sort((a, b) => Date.parse(a.data_inicio) - Date.parse(b.data_inicio)).map((appointment) => {
      const order = getRelation(appointment.pedidos);
      const items = order?.pedido_itens?.map((item) => item.nome_item) ?? [];
      const service = items.join(", ") || "Serviço";
      const status = appointment.status === "concluido"
        ? "done"
        : appointment.status === "em_andamento"
          ? "progress"
          : "pending";
      const appointmentDate = new Date(appointment.data_inicio);
      const isInSelectedDay = appointmentDate >= range.start && appointmentDate < range.end;
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone,
        ...(period === "Hoje" && isInSelectedDay ? {} : { day: "2-digit", month: "2-digit" }),
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      };
      const time = new Intl.DateTimeFormat("pt-BR", timeOptions).format(new Date(appointment.data_inicio));
      return {
        id: appointment.id,
        time,
        customer: order?.nome_contato || "Cliente",
        vehicle: appointment.placa ? `${appointment.veiculo} · ${appointment.placa}` : appointment.veiculo,
        service,
        kind: /lavag|higien/i.test(service) ? "wash" : "maintenance",
        status,
      };
    });

    const comparison = period === "Hoje" ? "em relação a ontem" : period === "Semana" ? "em relação à semana anterior" : "em relação ao mês anterior";

    return apiJson({
      companyName: settings?.nome_empresa || "Auto CT",
      metrics: {
        revenue: currentRevenue,
        appointments: currentAppointments,
        completed: currentCompleted,
        ticket: currentTicket,
        trends: [trend(currentRevenue, previousRevenue), trend(currentAppointments, previousAppointments), trend(currentCompleted, previousCompleted), trend(currentTicket, previousTicket)],
        comparison,
      },
      revenueSeries,
      appointments,
      appointmentCounts: {
        pending: (pendingRequestsResult.count ?? 0) + (confirmedRequestsResult.count ?? 0),
        progress: currentProgress,
        done: currentCompleted,
      },
    });
  } catch {
    return apiJson({ message: "Ocorreu um erro ao carregar as informações do painel." }, 503);
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Dados do agendamento inválidos." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Dados do agendamento inválidos." }, 400);
  }
  const body = payload as { id?: unknown; status?: unknown };

  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || !["em_andamento", "concluido"].includes(String(body.status))) {
    return apiJson({ message: "Dados do agendamento inválidos." }, 400);
  }

  try {
    const { data: appointment, error: appointmentError } = await context.supabase
      .from("agendamentos")
      .select("id,pedido_id,status")
      .eq("id", body.id)
      .neq("status", "cancelado")
      .maybeSingle();

    if (appointmentError) return apiJson({ message: "Não foi possível carregar o agendamento." }, 503);
    if (!appointment) return apiJson({ message: "Agendamento não encontrado." }, 404);

    if (body.status === "em_andamento") {
      if (appointment.status !== "pendente") return apiJson({ message: "Este agendamento não pode ser iniciado." }, 409);
      const { data: order, error: orderError } = await context.supabase
        .from("pedidos")
        .select("status")
        .eq("id", appointment.pedido_id)
        .maybeSingle();
      if (orderError) return apiJson({ message: "Não foi possível iniciar o serviço." }, 503);
      if (order?.status === "pendente") {
        const { data: confirmedOrder, error: confirmError } = await context.supabase
          .from("pedidos")
          .update({ status: "confirmado" })
          .eq("id", appointment.pedido_id)
          .eq("status", "pendente")
          .select("id")
          .maybeSingle();
        if (confirmError) return apiJson({ message: "Não foi possível iniciar o serviço." }, 503);
        if (!confirmedOrder) {
          const { data: latestOrder, error: latestOrderError } = await context.supabase
            .from("pedidos")
            .select("status")
            .eq("id", appointment.pedido_id)
            .maybeSingle();
          if (latestOrderError || latestOrder?.status !== "confirmado") {
            return apiJson({ message: "O pedido foi atualizado em outra sessão. Atualize o painel." }, 409);
          }
        }
      } else if (order?.status !== "confirmado") {
        return apiJson({ message: "Este pedido não pode ser iniciado." }, 409);
      }
    }

    if (body.status === "concluido" && appointment.status !== "em_andamento") {
      return apiJson({ message: "Inicie o serviço antes de concluí-lo." }, 409);
    }

    const { data, error } = await context.supabase
      .from("agendamentos")
      .update({ status: body.status as "em_andamento" | "concluido" })
      .eq("id", body.id)
      .eq("status", body.status === "em_andamento" ? "pendente" : "em_andamento")
      .select("id")
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível atualizar o agendamento." }, 503);
    if (!data) return apiJson({ message: "Agendamento não encontrado." }, 404);
    return apiJson({ ok: true });
  } catch {
    return apiJson({ message: "Não foi possível atualizar o agendamento." }, 503);
  }
}
