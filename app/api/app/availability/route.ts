import { apiJson } from "@/lib/supabase/admin";
import { takeRateLimit } from "@/lib/security/rate-limit";
import { createPublicSupabaseClient } from "@/lib/supabase/app";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const rate = takeRateLimit(request, "public-availability", 90, 60 * 1_000);
  if (!rate.allowed) {
    return Response.json({ message: "Muitas consultas de horários. Aguarde um pouco e tente novamente." }, {
      status: 429,
      headers: { "Cache-Control": "private, no-store", "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  const url = new URL(request.url);
  const serviceId = url.searchParams.get("serviceId");
  const date = url.searchParams.get("date");

  if (!serviceId || !UUID.test(serviceId) || !isCalendarDate(date)) {
    return apiJson({ message: "Serviço ou data inválidos." }, 400);
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.rpc("horarios_disponiveis", {
      p_servico_id: serviceId,
      p_data: date,
    });

    if (error) return apiJson({ message: "Não foi possível carregar os horários." }, 503);
    return apiJson({ slots: data ?? [] });
  } catch {
    return apiJson({ message: "A conexão com o Supabase não está configurada." }, 503);
  }
}
