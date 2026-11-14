import { createClient } from "@/lib/supabase/server";
import { REMEMBER_ACCESS_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/lib/supabase/cookies";
import { cookies } from "next/headers";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  remember?: unknown;
};

function jsonResponse(body: { message?: string; ok?: boolean }, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ message: "Dados de acesso inválidos." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ message: "Dados de acesso inválidos." }, 400);
  }

  const body = payload as LoginBody;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember !== false;

  if (!email || !password || email.length > 254 || password.length > 1024) {
    return jsonResponse({ message: "Informe e-mail e senha válidos." }, 400);
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient({ remember });
  } catch {
    return jsonResponse({ message: "A conexão com o Supabase ainda não está configurada." }, 503);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return jsonResponse({ message: "Não foi possível entrar. Verifique seus dados." }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return jsonResponse(
      { message: "Não foi possível validar o perfil. Confira se o schema MVP foi aplicado." },
      503,
    );
  }

  if (profile?.tipo !== "admin") {
    await supabase.auth.signOut();
    return jsonResponse({ message: "Esta conta não tem acesso ao painel administrativo." }, 403);
  }

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_ACCESS_COOKIE, remember ? "1" : "0", {
    httpOnly: true,
    maxAge: remember ? SESSION_COOKIE_MAX_AGE : undefined,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return jsonResponse({ ok: true });
}
