"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { preparerMystere } from "@/app/solo/mystere";
import type { TirageMystere } from "@/lib/solo/mystere";
import { RouletteMystere } from "./RouletteMystere";
import styles from "./mystere.module.css";

export function BoutonMystere({ choix, relance = false, memoriser }: {
  choix: string; relance?: boolean; memoriser?: (c: string) => void;
}) {
  const router = useRouter();
  const verrou = useRef(false);
  const [attente, startTransition] = useTransition();
  const [tirage, setTirage] = useState<TirageMystere>();
  const [erreur, setErreur] = useState<{ texte: string; profil?: string }>();
  const terminer = useCallback(() => { if (tirage) router.push(tirage.destination); }, [router, tirage]);
  function lancer() {
    if (verrou.current) return;
    verrou.current = true;
    setErreur(undefined);
    startTransition(async () => {
      try {
        const resultat = await preparerMystere(choix);
        if ("tirage" in resultat) {
          memoriser?.(resultat.tirage.choix);
          setTirage(resultat.tirage);
        } else { setErreur({ texte: resultat.erreur, profil: resultat.profil }); verrou.current = false; }
      } catch { setErreur({ texte: "Le thème mystère est momentanément indisponible. Réessaie dans un instant." }); verrou.current = false; }
    });
  }
  return <div className={styles.action}>
    <button type="button" className={styles.bouton} onClick={lancer} disabled={attente || Boolean(tirage)}>
      <span aria-hidden="true">✦</span> {attente ? "Préparation du tirage…" : relance ? "Relancer la roulette" : "Thème mystère"}
    </button>
    {!relance && <small>Un pack ou un thème surprise, avec ton niveau, ta précision et ta longueur.</small>}
    {erreur && <p role="alert">{erreur.texte} {erreur.profil && <Link href={erreur.profil}>Compléter mon profil</Link>}</p>}
    {tirage && <RouletteMystere tirage={tirage} terminer={terminer} />}
  </div>;
}
