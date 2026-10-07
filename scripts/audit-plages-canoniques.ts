import type { LigneCsv } from "./csv";

const MOIS = "(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)";
const JOUR = "\\d{1,2}(?:er)?";
const ANNEE = "-?\\d{3,4}";
const SEPARATEUR = "\\s*(?:[-–—]|à|au)\\s*";
const PREFIXE = "^(?:(?:du|de)\\s+)?";
const FIN = "(?:\\s+(?:av\\.|apr\\.)\\s*J\\.?-?C\\.?)?$";
// Plages entièrement explicites, dont une année ou un mois partagé.
// On ne déduit aucune borne et on ne traite pas les dates secondaires après « ; ».
const PLAGES = [
  new RegExp(`${PREFIXE}${JOUR}\\s+${MOIS}(?:\\s+${ANNEE})?${SEPARATEUR}${JOUR}\\s+${MOIS}\\s+${ANNEE}${FIN}`, "i"),
  new RegExp(`${PREFIXE}${JOUR}${SEPARATEUR}${JOUR}\\s+${MOIS}\\s+${ANNEE}${FIN}`, "i"),
  new RegExp(`${PREFIXE}${MOIS}(?:\\s+${ANNEE})?${SEPARATEUR}${MOIS}\\s+${ANNEE}${FIN}`, "i"),
  new RegExp(`${PREFIXE}${ANNEE}${SEPARATEUR}${ANNEE}${FIN}`, "i"),
  new RegExp(`^entre\\s+${ANNEE}\\s+et\\s+${ANNEE}${FIN}`, "i"),
];

/** Signalement indicatif du canon, sans correction ni validation historique. */
export function auditerPlagesCanoniques(evenements: LigneCsv[]): LigneCsv[] {
  return evenements.filter((e) => {
    const point = ["DAY", "MONTH", "YEAR"].includes(e.precision)
      && Boolean(e.start_year)
      && [e.end_year, e.end_month, e.end_day].every((v) => !v);
    const textePrincipal = e.date_text.split(";", 1)[0].trim();
    return point && PLAGES.some((motif) => motif.test(textePrincipal));
  });
}
