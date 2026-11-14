import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminGate({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || profile?.tipo !== "admin") {
    redirect("/login");
  }

  return children;
}
