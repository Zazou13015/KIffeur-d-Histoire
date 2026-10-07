// Une carte de contexte reprend un libellé de rattachement exact. Seules les
// années écrites explicitement et sans ambiguïté deviennent des bornes.
// Les siècles, décennies et autres périodes restent du texte, sans année fictive.
export function periodeContexte(libelle: string) {
  if (!libelle.trim()) throw new Error("Libellé de contexte vide");
  const plage = /^(\d{4})-(\d{4})(?=\s*:|$)/.exec(libelle);
  const annee = /^(\d{4})(?=\s*:|$)/.exec(libelle);
  if (plage && Number(plage[1]) > Number(plage[2])) throw new Error("Période de contexte inversée");
  const temporel = /\d{4}|\b[IVXLCDM]+e\s+siècle/i.test(libelle);
  if (!temporel) throw new Error("Contexte sans période explicite : aucune borne à inventer");
  return {
    start_year: plage ? Number(plage[1]) : annee ? Number(annee[1]) : null,
    start_month: null, start_day: null,
    end_year: plage ? Number(plage[2]) : annee ? Number(annee[1]) : null,
    end_month: null, end_day: null,
    date_text: libelle,
    date_precision: plage || annee ? "YEAR_RANGE" : "PERIOD_TEXT",
    date_status: plage || annee ? "CONVENTIONAL" : "APPROXIMATE",
  };
}
