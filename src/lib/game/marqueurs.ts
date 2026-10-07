// Marqueurs posés sur la frise (cartes d'événements) et regroupement des marqueurs proches.
// Sans DOM, pour rester testable.

import type { HistoricDate } from "./dates";
import { REGLAGES } from "./frise";
import type { Precision } from "./dates";

export type EtatMarqueur = "neutre" | "actif" | "juste" | "faux";

export type MarqueurFrise = {
  id: string;
  titre: string;
  date: HistoricDate;
  /** Motif de public/motifs.svg (« bastille », « caravelle »…). */
  motif?: string;
  etat?: EtatMarqueur;
};

// Marqueur avec sa position sur l'échelle de la frise (voir versT).
export type MarqueurPositionne = { id: string; t: number };

export type Groupe = {
  /** Position moyenne du groupe. */
  t: number;
  /** Plage couverte : sert à zoomer sur le groupe. */
  debut: number;
  fin: number;
  ids: string[];
};

// Premier indice dont t >= valeur (tableau trié par t).
function premierIndice(tries: MarqueurPositionne[], valeur: number): number {
  let a = 0;
  let b = tries.length;
  while (a < b) {
    const m = (a + b) >> 1;
    if (tries[m].t < valeur) a = m + 1;
    else b = m;
  }
  return a;
}

/**
 * Regroupe les marqueurs visibles dont les positions sont à moins de `ecartPx` les unes des autres.
 * `tries` doit être trié par t. Seuls les marqueurs de la plage visible sont parcourus
 * (recherche dichotomique), donc 200 marqueurs ou 20 000 coûtent le même rendu.
 * Quand la frise ne peut plus zoomer (`precision`), on ne regroupe plus : deux marqueurs
 * à la même date restent côte à côte au lieu de former un groupe impossible à ouvrir.
 */
export function regrouper(
  tries: MarqueurPositionne[],
  vue: { debut: number; fin: number },
  largeur: number,
  ecartPx: number,
  precision: Precision,
): Groupe[] {
  const span = vue.fin - vue.debut;
  const parPixel = span / largeur;
  const marge = ecartPx * parPixel;
  const depart = premierIndice(tries, vue.debut - marge);
  const peutZoomer = span > REGLAGES[precision].ecartMin * 1.5;
  const groupes: Groupe[] = [];
  let courant: Groupe | null = null;
  let somme = 0;
  for (let i = depart; i < tries.length && tries[i].t <= vue.fin + marge; i++) {
    const m = tries[i];
    if (courant && peutZoomer && (m.t - courant.fin) / parPixel < ecartPx) {
      courant.ids.push(m.id);
      courant.fin = m.t;
      somme += m.t;
      courant.t = somme / courant.ids.length;
    } else {
      courant = { t: m.t, debut: m.t, fin: m.t, ids: [m.id] };
      somme = m.t;
      groupes.push(courant);
    }
  }
  return groupes;
}
