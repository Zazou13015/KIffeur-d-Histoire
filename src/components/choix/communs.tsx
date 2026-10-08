"use client";

import { useFormStatus } from "react-dom";
import { DIFFICULTES, difficultePossible, type Comptes } from "@/lib/solo/choix";
import type { SoloDifficulty } from "@/lib/game/solo";
import styles from "./choix.module.css";

/** Lit le dernier choix mémorisé dans le navigateur (stockage local indisponible ou vide : rien). */
export function lireMemoire(cle: string): URLSearchParams | null {
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? new URLSearchParams(brut) : null;
  } catch {
    return null;
  }
}

export function ecrireMemoire(cle: string, valeur: string) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    // Navigation privée ou stockage bloqué : le choix ne sera simplement pas retenu.
  }
}

/** Première difficulté jouable, en partant de celle demandée. */
export function difficulteJouable(comptes: Comptes | null, voulue: SoloDifficulty): SoloDifficulty | null {
  if (difficultePossible(comptes, voulue)) return voulue;
  return DIFFICULTES.find((d) => difficultePossible(comptes, d.valeur))?.valeur ?? null;
}

export function ChoixDifficulte({ comptes, valeur, onChange }: { comptes: Comptes | null; valeur: SoloDifficulty | null; onChange: (d: SoloDifficulty) => void }) {
  return (
    <div className={styles.difficultes} role="group" aria-label="Difficulté">
      {DIFFICULTES.map((d) => {
        const possible = difficultePossible(comptes, d.valeur);
        return (
          <button key={d.valeur} type="button" className={styles.difficulte} aria-pressed={valeur === d.valeur} disabled={!possible} onClick={() => onChange(d.valeur)}>
            <b>{d.titre}</b>
            <small>{possible ? `Trouve ${d.aide}` : "Pas assez de questions ici"}</small>
          </button>
        );
      })}
    </div>
  );
}

export function BarreLancer({ resume, pret }: { resume: React.ReactNode; pret: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.lancer}>
      <p className={styles.resume}>{resume}</p>
      <button type="submit" className={styles.jouer} disabled={!pret || pending}>
        {pending ? "Préparation…" : "Jouer"}
      </button>
    </div>
  );
}

export function Etape({ numero, titre, children }: { numero: number; titre: string; children: React.ReactNode }) {
  return (
    <section className={styles.etape}>
      <h2><b>{numero}</b>{titre}</h2>
      {children}
    </section>
  );
}
