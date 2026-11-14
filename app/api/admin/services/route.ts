import { apiJson, getAdminContext } from "@/lib/supabase/admin";
import { catalogImagePath, isCatalogImageUrl } from "@/lib/supabase/catalog-images";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/app";

type ServiceInput = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  durationMinutes?: unknown;
  imageUrl?: unknown;
  active?: unknown;
  action?: unknown;
};

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function toService(service: { id: string; nome: string; descricao: string | null; preco: number | string; duracao_minutos: number; imagem_url: string | null; ativo: boolean }) {
  return {
    id: service.id,
    name: service.nome,
    description: service.descricao ?? "",
    price: Number(service.preco),
    durationMinutes: Number(service.duracao_minutos),
    imageUrl: service.imagem_url,
    active: service.ativo,
  };
}

function readService(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const body = payload as ServiceInput;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const { price, durationMinutes } = body;
  const imageUrl = body.imageUrl;

  if (
    name.length < 2 || name.length > 120 || description.length > 5000 ||
    typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 9_999_999_999.99 ||
    typeof durationMinutes !== "number" || !Number.isSafeInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480 ||
    (imageUrl !== undefined && !isCatalogImageUrl(imageUrl, "servicos")) ||
    (body.active !== undefined && typeof body.active !== "boolean")
  ) return null;

  return { name, description: description || null, price, durationMinutes, imageUrl: imageUrl as string | null | undefined, active: body.active as boolean | undefined };
}

export async function GET() {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  try {
    const [servicesResult, settingsResult] = await Promise.all([
      context.supabase
        .from("catalogo")
        .select("id,nome,descricao,preco,duracao_minutos,imagem_url,ativo")
        .eq("tipo", "servico")
        .order("criado_em", { ascending: false }),
      context.supabase.from("configuracoes").select("nome_empresa").eq("id", 1).maybeSingle(),
    ]);

    if (servicesResult.error || settingsResult.error) {
      return apiJson({ message: "Não foi possível carregar os serviços." }, 503);
    }

    const services = (servicesResult.data ?? []).map(toService);

    return apiJson({ services, companyName: settingsResult.data?.nome_empresa ?? "Auto CT" });
  } catch {
    return apiJson({ message: "Não foi possível carregar os serviços." }, 503);
  }
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Confira os dados do serviço." }, 400);
  }

  const service = readService(payload);
  if (!service) return apiJson({ message: "Confira nome, preço e duração do serviço." }, 400);

  try {
    const { data, error } = await context.supabase
      .from("catalogo")
      .insert({
        nome: service.name,
        tipo: "servico",
        descricao: service.description,
        preco: service.price,
        estoque: 0,
        duracao_minutos: service.durationMinutes,
        imagem_url: service.imageUrl ?? null,
        ativo: true,
      })
      .select("id,nome,descricao,preco,duracao_minutos,imagem_url,ativo")
      .single();

    if (error) return apiJson({ message: "Não foi possível salvar o serviço." }, 503);
    return apiJson({ service: toService(data) }, 201);
  } catch {
    return apiJson({ message: "Não foi possível salvar o serviço." }, 503);
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Confira os dados do serviço." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Confira os dados do serviço." }, 400);
  }

  const body = payload as ServiceInput;
  if (!validId(body.id)) return apiJson({ message: "Serviço inválido." }, 400);

  const statusOnly = body.action === "status" && typeof body.active === "boolean";
  const service = statusOnly ? null : readService(payload);
  if (!statusOnly && !service) {
    return apiJson({ message: "Confira nome, preço e duração do serviço." }, 400);
  }

  try {
    let previousImageUrl: string | null = null;
    if (!statusOnly) {
      const { data: existing, error: existingError } = await context.supabase
        .from("catalogo")
        .select("imagem_url")
        .eq("id", body.id)
        .eq("tipo", "servico")
        .maybeSingle();
      if (existingError) return apiJson({ message: "Não foi possível atualizar o serviço." }, 503);
      if (!existing) return apiJson({ message: "Serviço não encontrado." }, 404);
      previousImageUrl = existing.imagem_url;
    }

    const changes = statusOnly
      ? { ativo: body.active as boolean }
      : {
          nome: service!.name,
          descricao: service!.description,
          preco: service!.price,
          duracao_minutos: service!.durationMinutes,
          ...(service!.imageUrl === undefined ? {} : { imagem_url: service!.imageUrl }),
          ...(service!.active === undefined ? {} : { ativo: service!.active }),
        };
    const { data, error } = await context.supabase
      .from("catalogo")
      .update(changes)
      .eq("id", body.id)
      .eq("tipo", "servico")
      .select("id,nome,descricao,preco,duracao_minutos,imagem_url,ativo")
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível atualizar o serviço." }, 503);
    if (!data) return apiJson({ message: "Serviço não encontrado." }, 404);
    const oldImagePath = catalogImagePath(previousImageUrl, "servicos");
    if (oldImagePath && oldImagePath !== catalogImagePath(data.imagem_url, "servicos")) {
      try { await createPrivilegedSupabaseClient().storage.from("servicos").remove([oldImagePath]); } catch {}
    }
    return apiJson({ service: toService(data) });
  } catch {
    return apiJson({ message: "Não foi possível atualizar o serviço." }, 503);
  }
}
