"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Relire la source commune quand le joueur revient de l'autre jeu.
export default function ProfileRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return null;
}
