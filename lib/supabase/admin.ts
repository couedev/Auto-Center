import { createClient } from "./server";

export function apiJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function getAdminContext() {
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false as const,
      response: apiJson({ message: "Não foi possível acessar os dados agora. Tente novamente." }, 503),
    };
  }

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    return { ok: false as const, response: apiJson({ message: "Sessão inválida." }, 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      response: apiJson({ message: "Não foi possível acessar sua conta. Tente novamente." }, 503),
    };
  }

  if (profile?.tipo !== "admin") {
    return { ok: false as const, response: apiJson({ message: "Acesso restrito ao administrador." }, 403) };
  }

  return { ok: true as const, supabase, userId };
}
