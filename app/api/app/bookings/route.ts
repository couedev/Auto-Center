import { apiJson } from "@/lib/supabase/admin";
import { DEFAULT_TIME_ZONE, isValidTimeZone, localDateTimeToUtc } from "@/lib/app/time";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { createPrivilegedSupabaseClient, createPublicSupabaseClient } from "@/lib/supabase/app";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BookingInput = {
  serviceId: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  plate: string;
  date: string;
  time: string;
  turnstileToken: string;
  website: string;
};

function readInput(value: unknown): BookingInput | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const fields = ["serviceId", "name", "phone", "email", "vehicle", "plate", "date", "time"] as const;
  if (fields.some((field) => typeof body[field] !== "string")) return null;

  return {
    serviceId: (body.serviceId as string).trim(),
    name: (body.name as string).trim(),
    phone: (body.phone as string).trim(),
    email: (body.email as string).trim(),
    vehicle: (body.vehicle as string).trim(),
    plate: (body.plate as string).trim(),
    date: (body.date as string).trim(),
    time: (body.time as string).trim(),
    turnstileToken: typeof body.turnstileToken === "string" ? body.turnstileToken : "",
    website: typeof body.website === "string" ? body.website : "",
  };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function verifyTurnstile(token: string, request: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const configured = Boolean(secret && siteKey);
  const partiallyConfigured = Boolean(secret || siteKey);

  if (!configured) {
    if (process.env.NODE_ENV === "production" || partiallyConfigured) {
      return { ok: false, status: 503, message: "A verificação do agendamento ainda não está configurada." };
    }
    return { ok: true as const };
  }

  if (!token) return { ok: false, status: 400, message: "Conclua a verificação antes de continuar." };

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: request.headers.get("cf-connecting-ip") ?? undefined,
      }),
    });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const hostMatches = !expectedHost || !result.hostname || result.hostname.toLowerCase() === expectedHost.split(":")[0].toLowerCase();
    const actionMatches = !result.action || result.action === "booking";

    if (response.ok && result.success === true && hostMatches && actionMatches) return { ok: true as const };
  } catch {
    // Falhas de rede na validação não liberam o agendamento.
  }

  return { ok: false, status: 400, message: "A verificação expirou ou não foi concluída. Tente novamente." };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) return apiJson({ message: "A solicitação é grande demais." }, 413);

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return apiJson({ message: "Origem da solicitação inválida." }, 403);
  try {
    if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
      return apiJson({ message: "Origem da solicitação inválida." }, 403);
    }
  } catch {
    return apiJson({ message: "Origem da solicitação inválida." }, 403);
  }

  const rate = takeRateLimit(request, "public-booking", 5, 15 * 60 * 1_000);
  if (!rate.allowed) {
    return Response.json({ message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, {
      status: 429,
      headers: { "Cache-Control": "private, no-store", "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return apiJson({ message: "Dados do agendamento inválidos." }, 400); }
  const input = readInput(rawBody);
  if (!input) return apiJson({ message: "Preencha os dados do agendamento." }, 400);
  if (input.website.trim()) return apiJson({ message: "Não foi possível enviar o agendamento." }, 400);
  if (!UUID.test(input.serviceId)) return apiJson({ message: "O serviço selecionado é inválido." }, 400);
  if (input.name.length < 2 || input.name.length > 120) return apiJson({ message: "Informe seu nome completo." }, 400);
  const phone = input.phone.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 13) return apiJson({ message: "Informe um telefone válido com DDD." }, 400);
  const email = input.email.toLowerCase();
  if (email && (email.length > 254 || !EMAIL.test(email))) return apiJson({ message: "Informe um e-mail válido." }, 400);
  if (input.vehicle.length < 2 || input.vehicle.length > 100) return apiJson({ message: "Informe o modelo do veículo." }, 400);
  if (input.plate.length > 10) return apiJson({ message: "Confira a placa informada." }, 400);
  if (!validDate(input.date) || !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(input.time)) {
    return apiJson({ message: "Escolha uma data e um horário válidos." }, 400);
  }

  const captcha = await verifyTurnstile(input.turnstileToken, request);
  if (!captcha.ok) return apiJson({ message: captcha.message }, captcha.status);

  try {
    const publicSupabase = createPublicSupabaseClient();
    const { data: settings, error: settingsError } = await publicSupabase.rpc("configuracao_publica");
    if (settingsError) return apiJson({ message: "Não foi possível verificar o funcionamento da unidade." }, 503);
    const publicSettings = settings && typeof settings === "object" ? settings as Record<string, unknown> : {};
    const timeZone = isValidTimeZone(publicSettings.fuso_horario) ? publicSettings.fuso_horario : DEFAULT_TIME_ZONE;
    const startsAt = localDateTimeToUtc(input.date, input.time, timeZone);
    if (!startsAt) return apiJson({ message: "Esse horário não existe no fuso da unidade." }, 400);

    const { data: slots, error: slotsError } = await publicSupabase.rpc("horarios_disponiveis", {
      p_servico_id: input.serviceId,
      p_data: input.date,
    });
    if (slotsError) return apiJson({ message: "Não foi possível confirmar a disponibilidade." }, 503);
    const slotAvailable = Array.isArray(slots) && slots.some((slot) =>
      slot && typeof slot === "object" &&
      (slot as { horario?: unknown }).horario === input.time &&
      (slot as { disponivel?: unknown }).disponivel === true,
    );
    if (!slotAvailable) return apiJson({ message: "Esse horário não está mais disponível. Escolha outro." }, 409);

    const privilegedSupabase = createPrivilegedSupabaseClient();
    const { data, error } = await privilegedSupabase.rpc("criar_agendamento_sem_conta", {
      p_servico_id: input.serviceId,
      p_nome: input.name,
      p_telefone: phone,
      p_email: email || null,
      p_veiculo: input.vehicle,
      p_placa: input.plate || null,
      p_inicio: startsAt,
      p_canal: "app",
      p_cliente_id: null,
    });

    if (error || !data || typeof data !== "object") {
      const message = error?.message.toLowerCase() ?? "";
      if (message.includes("horario") || message.includes("horário") || message.includes("indisponivel")) {
        return apiJson({ message: "Esse horário acabou de ser reservado. Escolha outro." }, 409);
      }
      return apiJson({ message: "Não foi possível criar o agendamento. Confira os dados e tente novamente." }, 400);
    }

    const booking = data as Record<string, unknown>;
    if (typeof booking.pedido_id !== "string" || typeof booking.token_vinculacao !== "string") {
      return apiJson({ message: "O agendamento foi criado, mas não foi possível preparar o acesso ao histórico." }, 503);
    }

    return apiJson({
      booking: {
        id: booking.pedido_id,
        appointmentId: typeof booking.agendamento_id === "string" ? booking.agendamento_id : null,
        token: booking.token_vinculacao,
        total: Number(booking.valor_total),
        status: typeof booking.status === "string" ? booking.status : "pendente",
      },
      whatsapp: {
        enabled: booking.whatsapp_ativo === true,
        number: typeof booking.whatsapp_numero === "string" ? booking.whatsapp_numero : null,
      },
    }, 201);
  } catch {
    return apiJson({ message: "A conexão com o Supabase não está configurada." }, 503);
  }
}
