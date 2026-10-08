import type { SoloDifficulty } from "@/lib/game/solo";
import type { ProgressionChapitre } from "./types";

// Sans compte : la progression ne vit que dans l'onglet (sessionStorage) et disparaît avec lui.
// Le stockage peut manquer ou lever (navigation privée, données bloquées) : le jeu continue sans.
const CLE = "histoire-progression-session";
type Memoire = Record<string, ProgressionChapitre & { dernierePartie?: string }>;

function lire(): Memoire {
  try {
    const brut = JSON.parse(sessionStorage.getItem(CLE) ?? "{}");
    return brut && typeof brut === "object" && !Array.isArray(brut) ? (brut as Memoire) : {};
  } catch { return {}; }
}
function ecrire(m: Memoire) {
  try { sessionStorage.setItem(CLE, JSON.stringify(m)); } catch { /* stockage indisponible */ }
}
const vide = (): ProgressionChapitre => ({ decouvert: false, precision: null, difficulte: null, tests: 0 });

export function lireProgressionSession(): Record<string, ProgressionChapitre> {
  return lire();
}

export function noterDecouvertSession(chapitre: string) {
  const m = lire();
  m[chapitre] = { ...vide(), ...m[chapitre], decouvert: true };
  ecrire(m);
}

/** Retourne true si ce test devient le meilleur du chapitre dans la session. */
export function noterTestSession(chapitre: string, partie: string, precision: number, difficulte: SoloDifficulty): boolean {
  const m = lire();
  const avant = { ...vide(), ...m[chapitre] };
  // Recharger le même bilan ne compte pas deux fois.
  if (m[chapitre]?.dernierePartie === partie) return false;
  const meilleur = avant.precision == null || precision > avant.precision;
  m[chapitre] = {
    ...avant,
    precision: meilleur ? precision : avant.precision,
    difficulte: meilleur ? difficulte : avant.difficulte,
    tests: avant.tests + 1,
    dernierePartie: partie,
  };
  ecrire(m);
  return meilleur;
}
