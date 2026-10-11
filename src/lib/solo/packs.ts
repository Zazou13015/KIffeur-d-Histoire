import type { Comptes } from "./choix";

export type PackJouable = {
  id: string;
  titre: string;
  description: string;
  parent_id: string | null;
  comptes: Comptes;
  b: [number, number] | null;
};

/** Une parenté inactive n'empêche pas d'ouvrir directement l'enfant. */
export function packsRacines(packs: PackJouable[]) {
  const ids = new Set(packs.map((p) => p.id));
  return packs.filter((p) => !p.parent_id || !ids.has(p.parent_id));
}
