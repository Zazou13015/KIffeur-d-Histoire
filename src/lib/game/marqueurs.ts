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
  /** URL applicative d'une miniature entière (facultative, jamais un chemin de contenu). */
  illustration?: string;
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

/**
 * Range des cartes sans jamais les regrouper : chacune prend le premier couloir libre, du plus proche
 * de l'axe au plus haut. Quand tous les couloirs sont pris, la carte se décale vers la droite dans le
 * couloir qui demande le plus petit décalage (sa tige reste sous elle tant que c'est possible).
 * `positions` : centre (px) et demi-largeur de chaque carte, triées de gauche à droite.
 * Renvoie le couloir (0 = juste au-dessus de l'axe) et le centre où poser chaque carte.
 */
export function empiler(
  positions: { x: number; demi: number }[],
  largeur: number,
  couloirs: number,
  ecart = 6,
): { couloir: number; centre: number }[] {
  // Cartes serrées contre le bord droit : le même rangement mené de droite à gauche peut mieux tomber.
  const direct = ranger(positions, largeur, couloirs, ecart);
  if (chevauchements(direct, positions) === 0) return direct;
  const miroir = ranger([...positions].reverse().map((p) => ({ x: largeur - p.x, demi: p.demi })), largeur, couloirs, ecart)
    .reverse()
    .map((r) => ({ couloir: r.couloir, centre: largeur - r.centre }));
  return chevauchements(miroir, positions) < chevauchements(direct, positions) ? miroir : direct;
}

function chevauchements(rangs: { couloir: number; centre: number }[], positions: { demi: number }[]): number {
  let n = 0;
  for (let i = 0; i < rangs.length; i++)
    for (let j = i + 1; j < rangs.length; j++)
      if (rangs[i].couloir === rangs[j].couloir && Math.abs(rangs[i].centre - rangs[j].centre) < positions[i].demi + positions[j].demi) n++;
  return n;
}

function ranger(
  positions: { x: number; demi: number }[],
  largeur: number,
  couloirs: number,
  ecart: number,
): { couloir: number; centre: number }[] {
  const fins: number[] = [];
  const max = Math.max(1, couloirs);
  return positions.map(({ x, demi }) => {
    const gauche = Math.max(demi, Math.min(largeur - demi, x)) - demi;
    let k = fins.findIndex((f) => f + ecart <= gauche);
    if (k === -1 && fins.length < max) k = fins.push(-Infinity) - 1;
    let decalage = 0;
    if (k === -1) {
      k = fins.indexOf(Math.min(...fins));
      decalage = Math.max(0, Math.min(fins[k] + ecart - gauche, largeur - 2 * demi - gauche));
    }
    fins[k] = gauche + decalage + 2 * demi;
    return { couloir: k, centre: gauche + decalage + demi };
  });
}
