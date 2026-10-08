import catalogue from "./catalogue.json";
import { PERIODES } from "./periodes";
import { CHAPITRES } from "@/lib/apprendre/catalogue";
import type { SoloDifficulty, SoloFilters } from "@/lib/game/solo";
import { DEBUT_FRISE, FIN_FRISE, type Vue } from "@/lib/game/frise";

// Ce que le joueur choisit avant de lancer une partie (accueil, /solo, /scolaire, « Rejouer »).
// Le même choix voyage dans un formulaire, dans l'URL de la partie et dans le stockage local du navigateur.
export type Mode = "general" | "periode" | "pack" | "theme" | "scolaire";
export type Choix = {
  mode: Mode;
  difficulte: SoloDifficulty;
  periode?: string;
  /** Période libre, en années astronomiques (négatives avant J.-C.). */
  de?: number;
  a?: number;
  pack?: string;
  theme?: string;
  chapitres?: string[];
};
export type Comptes = Record<SoloDifficulty, number>;

export const QUESTIONS = 10;
export const DIFFICULTES: { valeur: SoloDifficulty; titre: string; aide: string }[] = [
  { valeur: "YEAR", titre: "Facile", aide: "l'année" },
  { valeur: "MONTH", titre: "Moyen", aide: "le mois et l'année" },
  { valeur: "DAY", titre: "Difficile", aide: "le jour exact" },
];

export const PACKS = catalogue.packs;
export const THEMES = catalogue.themes;
export { PERIODES, CHAPITRES };

const MODES: Mode[] = ["general", "periode", "pack", "theme", "scolaire"];
const estDifficulte = (v: unknown): v is SoloDifficulty => v === "YEAR" || v === "MONTH" || v === "DAY";
const annee = (v: string | null) => {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n !== 0 && Math.abs(n) <= 100000 ? n : null;
};

/**
 * Lit un choix depuis des champs de formulaire ou de l'URL, en n'acceptant que des valeurs connues.
 * Renvoie `null` si le choix est incomplet ou inventé.
 */
export function lireChoix(champs: URLSearchParams): Choix | null {
  const mode = champs.get("mode") as Mode;
  const difficulte = champs.get("difficulte");
  if (!MODES.includes(mode) || !estDifficulte(difficulte)) return null;
  const choix: Choix = { mode, difficulte };
  if (mode === "periode") {
    const periode = champs.get("periode");
    if (periode && periode !== "libre") {
      if (!PERIODES.some((p) => p.id === periode)) return null;
      choix.periode = periode;
    } else {
      const de = annee(champs.get("de"));
      const a = annee(champs.get("a"));
      if (de === null || a === null || (de === undefined && a === undefined)) return null;
      if (de !== undefined && a !== undefined && de > a) return null;
      choix.periode = "libre";
      if (de !== undefined) choix.de = de;
      if (a !== undefined) choix.a = a;
    }
  }
  if (mode === "pack") {
    const pack = champs.get("pack");
    if (!PACKS.some((p) => p.id === pack)) return null;
    choix.pack = pack!;
  }
  if (mode === "theme") {
    const theme = champs.get("theme");
    if (!THEMES.some((t) => t.id === theme)) return null;
    choix.theme = theme!;
  }
  if (mode === "scolaire") {
    const ids = new Set(champs.getAll("chapitres").flatMap((c) => c.split(",")));
    const chapitres = CHAPITRES.filter((c) => ids.has(c.id)).map((c) => c.id);
    if (chapitres.length === 0) return null;
    choix.chapitres = chapitres;
  }
  return choix;
}

/** Forme compacte du choix, pour l'URL de la partie (bouton « Rejouer ») et le stockage local. */
export function ecrireChoix(choix: Choix): string {
  const p = new URLSearchParams({ mode: choix.mode, difficulte: choix.difficulte });
  if (choix.periode) p.set("periode", choix.periode);
  if (choix.de != null) p.set("de", String(choix.de));
  if (choix.a != null) p.set("a", String(choix.a));
  if (choix.pack) p.set("pack", choix.pack);
  if (choix.theme) p.set("theme", choix.theme);
  if (choix.chapitres?.length) p.set("chapitres", choix.chapitres.join(","));
  return p.toString();
}

/** Filtres passés à la RPC `start_game`. */
export function filtresDepuis(choix: Choix): SoloFilters {
  const f: SoloFilters = { difficulty: choix.difficulte, questionCount: QUESTIONS };
  if (choix.mode === "periode") {
    const p = PERIODES.find((x) => x.id === choix.periode);
    const de = p ? p.de : choix.de;
    const a = p ? p.a : choix.a;
    if (de != null) f.yearMin = de;
    if (a != null) f.yearMax = a;
  }
  if (choix.mode === "pack") f.packId = choix.pack;
  if (choix.mode === "theme") f.tagId = choix.theme;
  if (choix.mode === "scolaire") f.chapterIds = choix.chapitres;
  return f;
}

/**
 * Nombre d'événements jouables par difficulté pour ce choix, d'après le dataset.
 * `null` quand on ne sait pas d'avance (période libre, chapitres) : le serveur tranchera.
 */
export function comptesDe(choix: Pick<Choix, "mode" | "periode" | "pack" | "theme" | "chapitres">): Comptes | null {
  if (choix.mode === "general") return catalogue.general;
  if (choix.mode === "periode") return (catalogue.periodes as Record<string, Comptes>)[choix.periode ?? ""] ?? null;
  if (choix.mode === "pack") return PACKS.find((p) => p.id === choix.pack)?.n ?? null;
  if (choix.mode === "theme") return THEMES.find((t) => t.id === choix.theme)?.n ?? null;
  if (choix.mode === "scolaire" && choix.chapitres?.length) {
    // Somme des chapitres : un plafond (un événement peut servir deux chapitres), le serveur tranche au-dessus.
    const n: Comptes = { YEAR: 0, MONTH: 0, DAY: 0 };
    for (const id of choix.chapitres) {
      const c = CHAPITRES_JOUABLES[id]?.n;
      if (c) for (const d of ["YEAR", "MONTH", "DAY"] as const) n[d] += c[d];
    }
    return n;
  }
  return null;
}

const CHAPITRES_JOUABLES = catalogue.chapitres as Record<string, { n: Comptes; b: number[] }>;
const versAstro = (annee: number) => (annee < 0 ? annee + 1 : annee);

/**
 * Étendue de la frise pour ce choix (positions `t`, années astronomiques), à 10 ans près autour des
 * événements possibles. `null` : toute l'histoire.
 */
export function bornesDe(choix: Choix): Vue | null {
  let b: number[] | undefined;
  if (choix.mode === "periode" && choix.periode === "libre") {
    b = [choix.de != null ? versAstro(choix.de) - 10 : DEBUT_FRISE, choix.a != null ? versAstro(choix.a) + 11 : FIN_FRISE];
  } else if (choix.mode === "periode") b = (catalogue.bornesPeriodes as Record<string, number[]>)[choix.periode ?? ""];
  else if (choix.mode === "pack") b = PACKS.find((p) => p.id === choix.pack)?.b;
  else if (choix.mode === "theme") b = THEMES.find((t) => t.id === choix.theme)?.b;
  else if (choix.mode === "scolaire") {
    const liste = (choix.chapitres ?? []).flatMap((id) => CHAPITRES_JOUABLES[id]?.b ?? []);
    if (liste.length) b = [Math.min(...liste), Math.max(...liste)];
  }
  if (!b) return null;
  const debut = Math.max(DEBUT_FRISE, b[0]);
  const fin = Math.min(FIN_FRISE, b[1]);
  if (fin - debut < 30) {
    const milieu = (debut + fin) / 2;
    return { debut: Math.max(DEBUT_FRISE, milieu - 15), fin: Math.min(FIN_FRISE, milieu + 15) };
  }
  return debut <= DEBUT_FRISE && fin >= FIN_FRISE ? null : { debut, fin };
}

/** Une difficulté est proposée s'il y a de quoi remplir une partie (ou si on ne peut pas le savoir). */
export function difficultePossible(comptes: Comptes | null, d: SoloDifficulty): boolean {
  return comptes == null || comptes[d] >= QUESTIONS;
}
