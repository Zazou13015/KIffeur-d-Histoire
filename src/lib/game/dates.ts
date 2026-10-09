// Règles de date partagées par tous les modes de jeu.

export type Precision = "annee" | "mois" | "jour";

export type HistoricDate = {
  year: number; // négatif = av. J.-C., jamais 0
  month?: number | null;
  day?: number | null;
};

export const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatHistoricDate(date: HistoricDate, precision: Precision): string {
  const annee = date.year < 0 ? `${-date.year} av. J.-C.` : `${date.year}`;
  if (precision === "annee" || !date.month) return annee;
  const mois = MOIS[date.month - 1];
  if (precision === "mois" || !date.day) return `${mois} ${annee}`;
  return `${date.day === 1 ? "1er" : date.day} ${mois} ${annee}`;
}

// Date ramenée à la précision jouée : en précision Année on ne parle que de l'année, en Mois du mois.
export function aLaPrecision(date: HistoricDate, precision: Precision): HistoricDate {
  if (precision === "annee" || date.month == null) return { year: date.year };
  if (precision === "mois" || date.day == null) return { year: date.year, month: date.month };
  return date;
}

// Écart entre la réponse et la bonne date, dans l'unité de la difficulté choisie.
// Approximation volontaire (mois de 30,44 jours) : suffisant pour un score, pas pour un calendrier.
export function gapInUnit(answer: HistoricDate, expected: HistoricDate, unit: Precision): number {
  const toDays = (d: HistoricDate) => {
    // Pas d'année 0 : on décale les années av. J.-C. pour que -1 et 1 soient consécutives.
    const y = d.year < 0 ? d.year + 1 : d.year;
    return y * 365.25 + ((d.month ?? 1) - 1) * 30.44 + ((d.day ?? 1) - 1);
  };
  const days = Math.abs(toDays(answer) - toDays(expected));
  if (unit === "jour") return Math.round(days);
  if (unit === "mois") return Math.round(days / 30.44);
  return Math.round(days / 365.25);
}

// Phrase d'écart pour un nombre d'unités de la difficulté, converti quand l'écart devient grand
// (« 3 jours », « 5 mois », « 12 ans »). null si la réponse est exacte.
export function phraseEcart(n: number, unit: Precision): string | null {
  const pluriel = (k: number, mot: string) => `${k} ${mot}${k > 1 ? "s" : ""}`;
  if (n === 0) return null;
  if (unit === "annee") return pluriel(n, "an");
  if (unit === "mois") return n < 24 ? `${n} mois` : pluriel(Math.round(n / 12), "an");
  if (n < 62) return pluriel(n, "jour");
  return n < 730 ? `${Math.round(n / 30.44)} mois` : pluriel(Math.round(n / 365.25), "an");
}

export function gapText(answer: HistoricDate, expected: HistoricDate, unit: Precision): string | null {
  return phraseEcart(gapInUnit(answer, expected, unit), unit);
}

// Points d'une réponse pour la page d'aperçu seulement : 1000 si exacte, décroissance exponentielle.
// Le vrai score se calcule en base (histoire.score_answer, formule du PRD), jamais dans le navigateur.
const ECHELLE_SCORE: Record<Precision, number> = { annee: 60, mois: 4 * 12, jour: 0.2 * 365.25 };

export function score(answer: HistoricDate, expected: HistoricDate, unit: Precision): number {
  const ecart = gapInUnit(answer, expected, unit);
  return Math.round(1000 * Math.exp(-ecart / ECHELLE_SCORE[unit]));
}
