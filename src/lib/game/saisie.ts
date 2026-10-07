// Les trois cases jour, mois, année et la date qu'elles représentent. Sans DOM, pour être testé.
// Le « - » devant l'année veut dire av. J.-C. ; le résultat est le même objet que celui de la frise.

import type { HistoricDate, Precision } from "./dates";
import { clamp, DEBUT_FRISE, FIN_FRISE, joursDansMois } from "./frise";

export type Champs = { jour: string; mois: string; annee: string };
export type Cle = keyof Champs;

export const CHAMPS_VIDES: Champs = { jour: "", mois: "", annee: "" };

// Ordre de saisie : jour, mois, année, avec seulement les cases utiles à la question.
export const ordreChamps = (p: Precision): Cle[] =>
  p === "jour" ? ["jour", "mois", "annee"] : p === "mois" ? ["mois", "annee"] : ["annee"];

export const chiffres = (v: string) => v.replace(/\D/g, "");

// Les cases à remplir à partir d'une date posée sur la frise.
export const champsDepuis = (d: HistoricDate): Champs => ({
  jour: d.day != null ? String(d.day).padStart(2, "0") : "",
  mois: d.month != null ? String(d.month).padStart(2, "0") : "",
  annee: (d.year < 0 ? "-" : "") + Math.abs(d.year),
});

// Date lue dans les cases ; null tant que l'année manque. Les valeurs hors limites sont ramenées dans la frise.
export function reponseDepuis(c: Champs, p: Precision): HistoricDate | null {
  const a = parseInt(chiffres(c.annee), 10);
  if (!a) return null;
  const year = clamp((c.annee.startsWith("-") ? -1 : 1) * a, DEBUT_FRISE, FIN_FRISE - 1);
  const d: HistoricDate = { year };
  const m = parseInt(c.mois, 10);
  const j = parseInt(c.jour, 10);
  if (p !== "annee" && m >= 1) d.month = clamp(m, 1, 12);
  if (p === "jour" && d.month && j >= 1) d.day = clamp(j, 1, joursDansMois(year, d.month));
  return d;
}

// Vrai quand toutes les cases demandées par la précision sont remplies.
export const casesCompletes = (c: Champs, p: Precision) => ordreChamps(p).every((k) => chiffres(c[k]) !== "");

// Vrai quand rien n'est saisi (le « - » seul compte comme une saisie).
export const casesVides = (c: Champs, p: Precision) => ordreChamps(p).every((k) => !chiffres(c[k])) && !c.annee.startsWith("-");
