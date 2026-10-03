// Règles de date partagées par tous les modes de jeu.

export type Precision = "annee" | "mois" | "jour";

export type HistoricDate = {
  year: number; // négatif = av. J.-C., jamais 0
  month?: number | null;
  day?: number | null;
};

const MOIS = [
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
