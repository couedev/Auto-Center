import { createHash } from "node:crypto";
import { dateTimeInZone, DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/app/time";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { apiJson } from "@/lib/supabase/admin";
import { createPrivilegedSupabaseClient, createPublicSupabaseClient } from "@/lib/supabase/app";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;

type Credential = { id: string; token: string };

function readCredentials(value: unknown): Credential[] | null {
  if (!value || typeof value !== "object") return null;
  const bookings = (value as Record<string, unknown>).bookings;
  if (!Array.isArray(bookings) || bookings.length > 20) return null;

  const credentials = bookings.filter((item): item is Credential => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === "string" && UUID.test(candidate.id) &&
      typeof candidate.token === "string" && TOKEN.test(candidate.token);
  });

  return credentials.length === bookings.length ? credentials : null;
}

function matchingOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host.toLowerCase(); }
  catch { return false; }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) return apiJson({ message: "A solicitação é grande demais." }, 413);
  if (!matchingOrigin(request)) return apiJson({ message: "Origem da solicitação inválida." }, 403);
  const rate = takeRateLimit(request, "public-booking-lookup", 30, 15 * 60 * 1_000);
  if (!rate.allowed) {
    return Response.json({ message: "Muitas consultas. Aguarde um pouco e tente novamente." }, {
      status: 429,
      headers: { "Cache-Control": "private, no-store", "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return apiJson({ message: "Consulta inválida." }, 400); }
  const credentials = readCredentials(body);
  if (!credentials) return apiJson({ message: "A lista de agendamentos está inválida." }, 400);
  if (!credentials.length) return apiJson({ appointments: [] });

  try {
    const publicSupabase = createPublicSupabaseClient();
    const privilegedSupabase = createPrivilegedSupabaseClient();
    const { data: settings } = await publicSupabase.rpc("configuracao_publica");
    const publicSettings = settings && typeof settings === "object" ? settings as Record<string, unknown> : {};
    const timeZone = isValidTimeZone(publicSettings.fuso_horario) ? publicSettings.fuso_horario : DEFAULT_TIME_ZONE;
    const now = new Date().toISOString();

    const results = await Promise.all(credentials.map(async ({ id, token }) => {
      const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
      const { data, error } = await privilegedSupabase
        .from("pedidos")
        .select("id,status,token_vinculacao_hash,pedido_itens(nome_item),agendamentos(data_inicio,veiculo,placa,status)")
        .eq("id", id)
        .eq("token_vinculacao_hash", tokenHash)
        .is("cliente_id", null)
        .gt("token_expira_em", now)
        .maybeSingle();

      if (error) return { appointment: null, queryFailed: true };
      if (!data) return { appointment: null, queryFailed: false };
      const item = data as unknown as {
        id: string;
        pedido_itens?: { nome_item?: string }[];
        agendamentos?: { data_inicio?: string; veiculo?: string; placa?: string | null; status?: string }[]
          | { data_inicio?: string; veiculo?: string; placa?: string | null; status?: string }
          | null;
      };
      const appointment = Array.isArray(item.agendamentos) ? item.agendamentos[0] : item.agendamentos;
      if (!appointment?.data_inicio) return { appointment: null, queryFailed: false };

      const dateTime = dateTimeInZone(appointment.data_inicio, timeZone);
      return { queryFailed: false, appointment: {
        id: item.id,
        serviceName: item.pedido_itens?.[0]?.nome_item ?? "Serviço agendado",
        date: dateTime.date,
        time: dateTime.time,
        vehicle: appointment.veiculo ?? "",
        plate: appointment.placa ?? "",
        status: appointment.status ?? "pendente",
      } };
    }));

    if (results.some((result) => result.queryFailed)) {
      return apiJson({ message: "Não foi possível consultar seus agendamentos agora." }, 503);
    }

    const appointments = results.flatMap((result) => result.appointment ? [result.appointment] : []).sort((a, b) =>
      `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    );
    return apiJson({ appointments });
  } catch {
    return apiJson({ message: "Não foi possível consultar seus agendamentos agora." }, 503);
  }
}
