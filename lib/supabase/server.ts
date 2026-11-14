import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_ACCESS_COOKIE } from "./cookies";
import { getSupabaseConfig } from "./env";

export async function createClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  const remember = options?.remember ?? cookieStore.get(REMEMBER_ACCESS_COOKIE)?.value !== "0";

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = { ...options };
            if (!remember) delete cookieOptions.maxAge;
            cookieStore.set(name, value, cookieOptions);
          });
        } catch {
          // Server Components não podem gravar cookies; o proxy atualiza a sessão.
        }
      },
    },
  });
}
