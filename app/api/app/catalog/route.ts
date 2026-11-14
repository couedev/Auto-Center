import { apiJson } from "@/lib/supabase/admin";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/app/time";
import { createPublicSupabaseClient } from "@/lib/supabase/app";

export async function GET() {
  try {
    const supabase = createPublicSupabaseClient();
    const [{ data: catalog, error: catalogError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from("catalogo")
        .select("id,nome,descricao,preco,duracao_minutos,imagem_url")
        .eq("tipo", "servico")
        .eq("ativo", true)
        .order("nome", { ascending: true }),
      supabase.rpc("configuracao_publica"),
    ]);

    if (catalogError || settingsError) {
      return apiJson({ message: "Não foi possível carregar os dados do aplicativo." }, 503);
    }

    const config = settings && typeof settings === "object" ? settings as Record<string, unknown> : {};
    const services = (catalog ?? []).map((item) => ({
      id: item.id,
      name: item.nome,
      description: item.descricao ?? "",
      price: Number(item.preco),
      durationMinutes: Number(item.duracao_minutos),
      imageUrl: item.imagem_url,
    })).filter((item) =>
      typeof item.id === "string" && typeof item.name === "string" &&
      Number.isFinite(item.price) && Number.isFinite(item.durationMinutes),
    );

    return apiJson({
      services,
      config: {
        name: typeof config.nome_empresa === "string" ? config.nome_empresa : "Auto CT",
        logoUrl: typeof config.logo_url === "string" ? config.logo_url : null,
        timezone: isValidTimeZone(config.fuso_horario) ? config.fuso_horario : DEFAULT_TIME_ZONE,
        whatsappEnabled: config.whatsapp_ativo === true,
        whatsappNumber: typeof config.whatsapp_numero === "string" ? config.whatsapp_numero : null,
      },
    });
  } catch {
    return apiJson({ message: "A conexão com o Supabase não está configurada." }, 503);
  }
}
