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

  if (!secretKey) throw new Error("A chave secreta do Supabase não está configurada no servidor.");
  return createClient(url, secretKey, authOptions);
}
