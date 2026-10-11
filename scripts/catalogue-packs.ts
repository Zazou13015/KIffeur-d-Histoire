import type { LigneCsv } from "./csv";

/** Le parent est une métadonnée facultative du dataset, sans modifier les CSV v18. */
export function contenuPacksHierarchiques(packs: LigneCsv[], associations: Map<string, string[]>) {
  const parId = new Map(packs.map((p) => [p.collection_id, p]));
  // Valider aussi les branches inactives, tout en permettant un enfant actif
  // dont le parent existe dans le dataset mais n'est pas proposé au joueur.
  for (const p of packs) {
    const chemin = new Set<string>();
    let courant: LigneCsv | undefined = p;
    while (courant) {
      if (chemin.has(courant.collection_id)) throw new Error(`Cycle de packs : ${courant.collection_id}`);
      chemin.add(courant.collection_id);
      if (!courant.parent_id) break;
      const parent: LigneCsv | undefined = parId.get(courant.parent_id);
      if (!parent) throw new Error(`Parent absent : ${courant.parent_id}`);
      courant = parent;
    }
  }
  const resultat = new Map<string, Set<string>>();
  const visite = (id: string, chemin: Set<string>): Set<string> => {
    if (chemin.has(id)) throw new Error(`Cycle de packs : ${id}`);
    if (resultat.has(id)) return resultat.get(id)!;
    const p = parId.get(id);
    if (p?.parent_id && !parId.has(p.parent_id)) throw new Error(`Parent absent : ${p.parent_id}`);
    const ids = new Set(associations.get(id) ?? []);
    const suite = new Set([...chemin, id]);
    for (const enfant of packs.filter((c) => c.parent_id === id && c.active !== "FALSE" && c.ready_to_play !== "FALSE")) {
      for (const event of visite(enfant.collection_id, suite)) ids.add(event);
    }
    resultat.set(id, ids);
    return ids;
  };
  for (const p of packs) visite(p.collection_id, new Set());
  return resultat;
}
