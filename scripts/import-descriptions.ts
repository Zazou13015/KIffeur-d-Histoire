// Fusion des propositions de l'issue #8, sans écraser une explication existante.
export type LigneDescription = Record<string, string>;

export function fusionnerDescriptions(
  evenements: LigneDescription[],
  propositions: LigneDescription[],
  existantes: Map<string, string | null>,
  url: string,
) {
  const adresse = new URL(url);
  const local = adresse.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(adresse.hostname);
  const parId = new Map(evenements.map((e) => [e.event_id, e]));
  const ajouts = new Map<string, LigneDescription>();
  for (const proposition of propositions) {
    const id = proposition.event_id;
    const canonique = parId.get(id);
    if (!canonique || ajouts.has(id) || proposition.title_canonical !== canonique.title_canonical) {
      throw new Error(`Proposition de description inconnue, dupliquée ou titre différent : ${id}`);
    }
    if (!proposition.description_short?.trim() || proposition.description_short.length > 280 || !proposition.sources?.trim()) {
      throw new Error(`Proposition de description vide, trop longue ou sans source : ${id}`);
    }
    if (!["", "VALIDE"].includes(proposition.antonin_validation)) {
      throw new Error(`Validation de description inconnue : ${id}`);
    }
    ajouts.set(id, proposition);
  }
  const bilan = { completees: 0, identiques: 0, canoniquesConservees: 0, baseConservees: 0, nonValideesIgnorees: 0 };
  const resultat = evenements.map((e) => {
    const proposition = ajouts.get(e.event_id);
    const actuelle = existantes.get(e.event_id) ?? "";
    if (e.description_short.trim()) {
      if (proposition) bilan.canoniquesConservees++;
      return e;
    }
    const autorisee = proposition && (local || proposition.antonin_validation === "VALIDE");
    if (proposition && !autorisee) bilan.nonValideesIgnorees++;
    if (actuelle.trim()) {
      if (autorisee && actuelle === proposition.description_short) bilan.identiques++;
      else if (autorisee) bilan.baseConservees++;
      return { ...e, description_short: actuelle };
    }
    if (autorisee) {
      bilan.completees++;
      return { ...e, description_short: proposition.description_short };
    }
    return e;
  });
  return { evenements: resultat, bilan, local };
}
