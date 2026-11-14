import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_ACCESS_COOKIE } from "./lib/supabase/cookies";
import { getSupabaseConfig } from "./lib/supabase/env";

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  const remember = request.cookies.get(REMEMBER_ACCESS_COOKIE)?.value !== "0";
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const cookieOptions = { ...options };
          if (!remember) delete cookieOptions.maxAge;
          response.cookies.set(name, value, cookieOptions);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Verifica e renova a sessão; autorização de administrador é feita no servidor.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/auth/:path*"],
};
