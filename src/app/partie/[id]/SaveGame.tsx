"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimGame } from "@/app/solo/actions";

export default function SaveGame({ gameId }: { gameId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    claimGame(gameId).then(result => {
      if (result.saved) router.refresh();
      else setError(result.error);
    }).catch(() => setError("Sauvegarde indisponible. Recharge la page pour réessayer."));
  }, [gameId, router]);
  return <p role={error ? "alert" : "status"}>{error ?? "Sauvegarde de la partie…"}</p>;
}
