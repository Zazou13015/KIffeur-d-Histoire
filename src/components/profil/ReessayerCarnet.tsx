"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./Profil.module.css";
export function ReessayerCarnet() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={styles.link}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Ouverture…" : "Réessayer"}
    </button>
  );
}
