"use client";

import { useEffect, useRef } from "react";
import { nombreQuestions, type Longueur } from "@/lib/solo/choix";
import { packsRacines, type PackJouable } from "@/lib/solo/packs";
import type { SoloDifficulty } from "@/lib/game/solo";
import styles from "./choix.module.css";

export function SelectionPacks({ packs, ouvert, selection, precision, longueur, onOuvrir, onChoisir }: {
  packs: PackJouable[]; ouvert: string | null; selection: string; precision: SoloDifficulty;
  longueur: Longueur; onOuvrir: (id: string | null) => void; onChoisir: (id: string) => void;
}) {
  const parent = packs.find((p) => p.id === ouvert);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigation = useRef<string | null>(ouvert);
  useEffect(() => {
    if (navigation.current !== ouvert) heading.current?.focus();
    navigation.current = ouvert;
  }, [ouvert]);
  const liste = parent ? [parent, ...packs.filter((p) => p.parent_id === parent.id)] : packsRacines(packs);
  return <div className={styles.selectionPacks}>
    <h3 ref={heading} tabIndex={-1}>{parent ? parent.titre : "Packs disponibles"}</h3>
    {parent && <button type="button" className={styles.retour}
      onClick={() => onOuvrir(packs.find((p) => p.id === parent.parent_id)?.id ?? null)}>
      ← {packs.find((p) => p.id === parent.parent_id)?.titre ?? "Tous les packs"}
    </button>}
    <ul className={styles.listePacks} aria-label={parent ? `Sous-packs de ${parent.titre}` : "Packs disponibles"}>
      {liste.map((p) => {
        const enfants = packs.some((c) => c.parent_id === p.id);
        const tout = p.id === parent?.id;
        const n = p.comptes[precision];
        const impossible = nombreQuestions(longueur, n) === null;
        return <li key={p.id}>
          <button type="button" className={styles.tuile} disabled={impossible && (!enfants || tout)}
            aria-pressed={selection === p.id} onClick={() => {
              if (enfants && !tout) onOuvrir(p.id);
              else onChoisir(p.id);
            }}>
            <b>{tout ? `Tout le pack ${p.titre}` : p.titre}{enfants && !tout ? " →" : ""}</b>
            <small>{n} question{n > 1 ? "s" : ""} disponible{n > 1 ? "s" : ""}
              {impossible ? " · Pas assez pour cette longueur" : ""}</small>
          </button>
        </li>;
      })}
    </ul>
  </div>;
}
