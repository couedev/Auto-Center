"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import styles from "./dashboard.module.css";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function signOut() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível sair. Tente novamente.");

      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.signOutButton}
      onClick={signOut}
      disabled={isLoading}
      aria-label="Sair da conta"
      title="Sair da conta"
    >
      {isLoading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <LogOut aria-hidden="true" />}
    </button>
  );
}
