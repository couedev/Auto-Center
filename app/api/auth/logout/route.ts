import { createClient } from "@/lib/supabase/server";
import { REMEMBER_ACCESS_COOKIE } from "@/lib/supabase/cookies";
import { cookies } from "next/headers";

function jsonResponse(body: { message?: string; ok?: boolean }, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return jsonResponse({ message: "Não foi possível encerrar a sessão." }, 503);
    }

    const cookieStore = await cookies();
    cookieStore.set(REMEMBER_ACCESS_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ message: "Não foi possível encerrar a sessão." }, 503);
  }
}
