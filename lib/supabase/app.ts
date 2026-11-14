import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./env";

const authOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, authOptions);
}

export function createPrivilegedSupabaseClient() {
  const { url } = getSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) throw new Error("Não foi possível conectar agora. Tente novamente.");
  return createClient(url, secretKey, authOptions);
}
