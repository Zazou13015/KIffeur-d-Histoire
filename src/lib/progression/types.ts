import type { SoloDifficulty } from "@/lib/game/solo";

// Progression d'un joueur dans le mode pédagogique, par chapitre du catalogue (THM-…).
export type ProgressionChapitre = {
  decouvert: boolean;
  /** Meilleure précision (0 à 100) d'un test de ce chapitre ; null = jamais testé. */
  precision: number | null;
  difficulte: SoloDifficulty | null;
  tests: number;
};
export type Progression = {
  /** true : lue dans le compte ; false : gardée dans le navigateur le temps de la session. */
  connecte: boolean;
  chapitres: Record<string, ProgressionChapitre>;
};

export const LIBELLE_DIFFICULTE: Record<SoloDifficulty, string> = { YEAR: "Facile", MONTH: "Moyen", DAY: "Difficile" };

/** Un test de chapitre compte au moins 5 questions : en dessous, la précision ne dit rien. */
export const QUESTIONS_MIN_TEST = 5;

export type LigneProgression = {
  chapter_id: string;
  discovered_at: string | null;
  best_accuracy: number | string | null;
  best_difficulty: string | null;
  tests_count: number;
};

const estDifficulte = (v: unknown): v is SoloDifficulty => v === "YEAR" || v === "MONTH" || v === "DAY";

/** Lignes de `histoire.learning_progress` (RLS : celles du joueur seulement) vers la forme du navigateur. */
export function progressionDepuisLignes(lignes: LigneProgression[], idsConnus: ReadonlySet<string>): Record<string, ProgressionChapitre> {
  const chapitres: Record<string, ProgressionChapitre> = {};
  for (const l of lignes) {
    if (!idsConnus.has(l.chapter_id)) continue;
    const precision = l.best_accuracy == null ? null : Number(l.best_accuracy);
    chapitres[l.chapter_id] = {
      decouvert: l.discovered_at != null,
      precision: precision != null && Number.isFinite(precision) ? precision : null,
      difficulte: estDifficulte(l.best_difficulty) ? l.best_difficulty : null,
      tests: Number.isInteger(l.tests_count) && l.tests_count > 0 ? l.tests_count : 0,
    };
  }
  return chapitres;
}
