import { apiJson, getAdminContext } from "@/lib/supabase/admin";

type OpeningHours = Record<string, { abre: string; fecha: string } | null>;

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const hours: OpeningHours = {};

  for (const day of ["1", "2", "3", "4", "5", "6", "7"]) {
    const entry = input[day];
    if (entry === null) {
      hours[day] = null;
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const { abre, fecha } = entry as { abre?: unknown; fecha?: unknown };
    if (!validTime(abre) || !validTime(fecha)) return null;
    const startMinutes = Number(abre.slice(0, 2)) * 60 + Number(abre.slice(3));
    const endMinutes = Number(fecha.slice(0, 2)) * 60 + Number(fecha.slice(3));
    if (endMinutes <= startMinutes) return null;
    hours[day] = { abre, fecha };
  }

  return hours;
}

export async function GET() {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from("configuracoes")
      .select("id,nome_empresa,logo_url,whatsapp_numero,whatsapp_ativo,fuso_horario,horarios_funcionamento")
      .eq("id", 1)
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível carregar as configurações." }, 503);
    if (!data) return apiJson({ message: "A configuração inicial da empresa não foi encontrada." }, 404);
    return apiJson({ settings: data });
  } catch {
    return apiJson({ message: "Não foi possível carregar as configurações." }, 503);
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Dados das configurações inválidos." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Dados das configurações inválidos." }, 400);
  }

  const body = payload as Record<string, unknown>;
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const phone = typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : "";
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
  const whatsappActive = body.whatsappActive;
  const hours = parseHours(body.hours);

  if (
    company.length < 2 || company.length > 120 || phone.length > 30 || logoUrl.length > 2048 ||
    (logoUrl && !/^https?:\/\//i.test(logoUrl)) || typeof whatsappActive !== "boolean" || !hours
  ) {
    return apiJson({ message: "Confira o nome, WhatsApp, logo e horários informados." }, 400);
  }

  try {
    const { data, error } = await context.supabase
      .from("configuracoes")
      .update({
        nome_empresa: company,
        logo_url: logoUrl || null,
        whatsapp_numero: phone || null,
        whatsapp_ativo: whatsappActive,
        horarios_funcionamento: Object.fromEntries(Object.entries(hours).filter(([, value]) => value !== null)),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("id,nome_empresa,logo_url,whatsapp_numero,whatsapp_ativo,fuso_horario,horarios_funcionamento")
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível salvar as configurações." }, 503);
    if (!data) return apiJson({ message: "A configuração inicial da empresa não foi encontrada." }, 404);
    return apiJson({ settings: data });
  } catch {
    return apiJson({ message: "Não foi possível salvar as configurações." }, 503);
  }
}
