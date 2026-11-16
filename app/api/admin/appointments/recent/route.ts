import { apiJson, getAdminContext } from "@/lib/supabase/admin";

type AppointmentRow = {
  id: string;
  criado_em: string;
  data_inicio: string;
  veiculo: string;
  placa: string | null;
  pedidos: {
    nome_contato: string;
    valor_total: number | string;
    pedido_itens: { nome_item: string }[];
  } | null;
};

function getOrder(value: AppointmentRow["pedidos"] | AppointmentRow["pedidos"][]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toAppointment(appointment: AppointmentRow, timeZone: string) {
  const order = getOrder(appointment.pedidos);
  const service = order?.pedido_itens?.map((item) => item.nome_item).join(", ") || "Serviço";
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(appointment.data_inicio));

  return {
    id: appointment.id,
    createdAt: appointment.criado_em,
    time,
    customer: order?.nome_contato || "Cliente",
    vehicle: appointment.placa ? `${appointment.veiculo} · ${appointment.placa}` : appointment.veiculo,
    service,
    amount: Number(order?.valor_total || 0),
  };
}

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  if (id && !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiJson({ message: "Agendamento inválido." }, 400);
  }
  if (since && (!sinceDate || Number.isNaN(sinceDate.getTime()))) {
    return apiJson({ message: "Data de consulta inválida." }, 400);
  }

  try {
    const { data: settings, error: settingsError } = await context.supabase
      .from("configuracoes")
      .select("fuso_horario")
      .eq("id", 1)
      .maybeSingle();
    if (settingsError) return apiJson({ message: "Não foi possível consultar os novos agendamentos." }, 503);
    const timeZone = settings?.fuso_horario || "America/Santarem";

    const select = "id,criado_em,data_inicio,veiculo,placa,pedidos!inner(nome_contato,valor_total,pedido_itens(nome_item))";
    if (id) {
      const { data, error } = await context.supabase
        .from("agendamentos")
        .select(select)
        .eq("id", id)
        .neq("status", "cancelado")
        .maybeSingle();

      if (error) return apiJson({ message: "Não foi possível carregar os dados do agendamento." }, 503);
      if (!data) return apiJson({ message: "Agendamento não encontrado." }, 404);

      return apiJson({ appointment: toAppointment(data as unknown as AppointmentRow, timeZone) });
    }

    const checkedAt = new Date().toISOString();
    let query = context.supabase
      .from("agendamentos")
      .select(select)
      .neq("status", "cancelado")
      .limit(30);

    if (sinceDate) {
      query = query.gte("criado_em", sinceDate.toISOString()).order("criado_em", { ascending: true });
    } else {
      query = query.order("criado_em", { ascending: false });
    }

    const { data, error } = await query;
    if (error) return apiJson({ message: "Não foi possível consultar os novos agendamentos." }, 503);

    const appointments = ((data ?? []) as unknown as AppointmentRow[]).map((appointment) => toAppointment(appointment, timeZone));
    return apiJson({ checkedAt, appointments });
  } catch {
    return apiJson({ message: "Não foi possível consultar os novos agendamentos." }, 503);
  }
}
