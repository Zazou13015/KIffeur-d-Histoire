// Calculs de la frise, sans DOM : position des dates, graduations, décor.
// Sur la frise, une date est un nombre d'années « t » sur l'échelle astronomique
// (pas d'année 0 côté joueur : t = 0 correspond à 1 av. J.-C.).

import type { HistoricDate, Precision } from "./dates";

export const DEBUT_FRISE = -3500;
export const FIN_FRISE = 2030;

export type Epoque = {
  debut: number;
  fin: number;
  nom: string;
  court: string;
  couleur: string;
  motifs: string[];
};

export const EPOQUES: Epoque[] = [
  { debut: -3500, fin: -3200, nom: "Préhistoire", court: "Préhist.", couleur: "var(--color-epoque-prehistoire)", motifs: ["biface", "flamme", "main"] },
  { debut: -3200, fin: 476, nom: "Antiquité", court: "Antiq.", couleur: "var(--color-epoque-antiquite)", motifs: ["pyramide", "amphore", "colonne", "casque", "parchemin"] },
  { debut: 476, fin: 1492, nom: "Moyen Âge", court: "M. Âge", couleur: "var(--color-epoque-moyen-age)", motifs: ["donjon", "ecu", "epee", "couronne", "vitrail"] },
  { debut: 1492, fin: 1789, nom: "Temps modernes", court: "T. mod.", couleur: "var(--color-epoque-temps-modernes)", motifs: ["caravelle", "plume", "globe", "lys", "boussole", "couronne"] },
  { debut: 1789, fin: 2030, nom: "Époque contemporaine", court: "Contemp.", couleur: "var(--color-epoque-contemporaine)", motifs: ["cocarde", "journal", "locomotive", "tour", "ampoule", "avion", "fusee"] },
];

// Année d'apparition des motifs, pour éviter les anachronismes (pas d'avion en 1800).
const APPARITION: Record<string, number> = { locomotive: 1830, tour: 1889, ampoule: 1880, avion: 1910, fusee: 1957, caravelle: 1400, globe: 1490 };

// Réglages par précision demandée : zoom minimal, zoom de suivi pendant la saisie, marge à la correction.
export const REGLAGES: Record<Precision, { ecartMin: number; suivi: number[]; marge: number; consigne: string }> = {
  annee: { ecartMin: 12, suivi: [300], marge: 15, consigne: "À trouver : l'année" },
  mois: { ecartMin: 1.2, suivi: [300, 4], marge: 1, consigne: "À trouver : le mois et l'année" },
  jour: { ecartMin: 0.03, suivi: [300, 4, 0.35], marge: 0.06, consigne: "À trouver : le jour exact" },
};

export const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const bissextile = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
export const joursDansMois = (annee: number, mois: number) =>
  [31, bissextile(annee) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mois - 1];

// Année historique (jamais 0) <-> année astronomique.
const versAstro = (annee: number) => (annee < 0 ? annee + 1 : annee);
const versHistorique = (astro: number) => (astro <= 0 ? astro - 1 : astro);

export const texteAnnee = (annee: number) => (annee < 0 ? `${-annee} av. J.-C.` : `${annee}`);

// Écriture courte (étiquettes de la frise) : « 14 juil. 1789 ».
export function dateCourte(d: HistoricDate): string {
  if (d.month == null) return texteAnnee(d.year);
  const jour = d.day == null ? "" : d.day === 1 ? "1er " : `${d.day} `;
  return `${jour}${MOIS_COURTS[d.month - 1]} ${texteAnnee(d.year)}`;
}

// Position sur la frise : l'année seule sur sa graduation, le mois au milieu de son mois, le jour au milieu de sa journée.
export function versT(d: HistoricDate): number {
  const a = versAstro(d.year);
  if (d.month == null) return a;
  if (d.day == null) return a + (d.month - 1) / 12 + 1 / 24;
  return a + (d.month - 1) / 12 + (d.day - 0.5) / (12 * joursDansMois(d.year, d.month));
}

// Date visée par un point de la frise, à la précision demandée.
export function depuisT(t: number, precision: Precision): HistoricDate {
  if (precision === "annee") return { year: versHistorique(Math.round(t)) };
  const a = Math.floor(t);
  const year = versHistorique(a);
  const fm = (t - a) * 12;
  const month = Math.min(12, Math.floor(fm) + 1);
  if (precision === "mois") return { year, month };
  const n = joursDansMois(year, month);
  return { year, month, day: Math.min(n, Math.floor((fm - (month - 1)) * n) + 1) };
}

// Un pas de la précision demandée (flèches du clavier).
export function decaler(d: HistoricDate, pas: number, precision: Precision): HistoricDate {
  if (precision === "annee") return { year: versHistorique(versAstro(d.year) + pas) };
  if (precision === "mois") {
    const k = versAstro(d.year) * 12 + (d.month ?? 1) - 1 + pas;
    return { year: versHistorique(Math.floor(k / 12)), month: (((k % 12) + 12) % 12) + 1 };
  }
  return depuisT(versT(d) + pas / 365.25, "jour");
}

// ---------- Graduations : années, puis mois, puis jours ----------

export type Pas = { unite: "jour" | "mois" | "an"; n: number; duree: number };

const PAS: Pas[] = [
  ...[1, 2, 5, 10].map((n) => ({ unite: "jour" as const, n, duree: n / 365.25 })),
  ...[1, 2, 3, 6].map((n) => ({ unite: "mois" as const, n, duree: n / 12 })),
  ...[1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].map((n) => ({ unite: "an" as const, n, duree: n })),
];

export type Vue = { debut: number; fin: number };

export function choisirPas(vue: Vue, largeur: number, precision: Precision): Pas {
  const permis = PAS.filter((p) =>
    precision === "jour" ? true : precision === "mois" ? p.unite !== "jour" : p.unite === "an",
  );
  const ecart = vue.debut < 0 ? 112 : 78; // les étiquettes « av. J.-C. » sont plus larges
  const span = vue.fin - vue.debut;
  return permis.find((p) => (largeur / span) * p.duree >= ecart) ?? permis[permis.length - 1];
}

export function legendePas(p: Pas): string {
  if (p.unite === "jour") return `1 graduation = ${p.n} jour${p.n > 1 ? "s" : ""}`;
  if (p.unite === "mois") return `1 graduation = ${p.n} mois`;
  if (p.n === 1) return "1 graduation = 1 an";
  if (p.n === 100) return "1 graduation = 1 siècle";
  if (p.n === 1000) return "1 graduation = 1 millénaire";
  if (p.n === 2000) return "1 graduation = 2 millénaires";
  return `1 graduation = ${p.n} ans`;
}

// annee : année à afficher, en gras quand la graduation est majeure (janvier, 1er du mois).
export type Graduation = { t: number; texte: string; annee?: number; majeure?: boolean };

export function graduations(vue: Vue, p: Pas): Graduation[] {
  const out: Graduation[] = [];
  if (p.unite === "an") {
    // Multiples « historiques » : 1000 av. J.-C., 500 av. J.-C., 500, 1000…
    const premier = Math.ceil(versHistorique(Math.floor(vue.debut)) / p.n) * p.n;
    for (let y = premier; versAstro(y) <= vue.fin; y += p.n) {
      if (y === 0) continue;
      const t = versAstro(y);
      if (t >= vue.debut) out.push({ t, texte: "", annee: y });
    }
  } else if (p.unite === "mois") {
    for (let k = Math.ceil((vue.debut * 12) / p.n) * p.n; k / 12 <= vue.fin; k += p.n) {
      const mi = ((k % 12) + 12) % 12;
      const annee = versHistorique(Math.floor(k / 12));
      out.push(mi === 0 ? { t: k / 12, texte: "", annee, majeure: true } : { t: k / 12, texte: MOIS_COURTS[mi] });
    }
  } else {
    for (let k = Math.floor(vue.debut * 12) - 1; k / 12 <= vue.fin; k++) {
      const a = Math.floor(k / 12);
      const annee = versHistorique(a);
      const m = (((k % 12) + 12) % 12) + 1;
      const n = joursDansMois(annee, m);
      for (let d = 1; d <= n; d += p.n) {
        if (p.n > 1 && d > 1 && n - d < p.n / 2) continue;
        const t = a + (m - 1) / 12 + (d - 1) / (12 * n);
        if (t < vue.debut || t > vue.fin) continue;
        out.push(
          d === 1
            ? { t, texte: `1er ${MOIS_COURTS[m - 1]}`, annee: m === 1 ? annee : undefined, majeure: true }
            : { t, texte: `${d}` },
        );
      }
    }
  }
  return out;
}

// Rappel affiché en haut à gauche quand on zoome sous l'année.
export function contexte(vue: Vue, p: Pas): string {
  if (p.unite === "an") return "";
  const c = (vue.debut + vue.fin) / 2;
  const a = Math.floor(c);
  const annee = versHistorique(a);
  if (p.unite === "mois") return texteAnnee(annee);
  return `${MOIS[Math.floor((c - a) * 12)]} ${texteAnnee(annee)}`;
}

// ---------- Décor : petits motifs gravés propres à chaque époque ----------

// Hachage déterministe : un motif reste à sa place quand on zoome ou qu'on se déplace.
function hacher(n: number): number {
  let x = Math.imul((n | 0) + 0x2545f491, 0x9e3779b1);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

const PAS_DECOR = [1 / 360, 1 / 180, 1 / 96, 1 / 48, 1 / 24, 1 / 12, 1 / 6, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const COULOIRS = [14, 50, 86, 120];

export type Motif = { cle: string; motif: string; x: number; haut: number; taille: number; angle: number; discret: boolean };

/** `ecart` : place minimale (px) entre deux motifs ; l'écran de jeu en met moins pour laisser respirer la frise. */
export function decor(vue: Vue, largeur: number, ecart = 34): Motif[] {
  const span = vue.fin - vue.debut;
  const X = (t: number) => ((t - vue.debut) / span) * largeur;
  const pas = PAS_DECOR.find((p) => (largeur / span) * p >= ecart) ?? 1000;
  // Sous trois ans visibles, le décor se fait discret pour laisser lire les mois et les jours.
  const discret = span < 3;
  const out: Motif[] = [];
  let couloirPrec = -1;
  let motifPrec = "";
  for (let y = Math.floor(vue.debut / pas) * pas; y <= vue.fin + pas; y += pas) {
    const h = hacher(Math.round(y * 1440));
    const yy = y + ((h % 1000) / 1000 - 0.5) * pas * 0.3;
    const ep = EPOQUES.find((b) => yy >= b.debut && yy < b.fin);
    if (!ep || ((ep.fin - ep.debut) / span) * largeur < 40) {
      couloirPrec = -1;
      continue;
    }
    const x = X(yy);
    if (x < -60 || x > largeur + 60) continue;
    if (discret && (h >>> 24) % 3) continue;
    const choix = ep.motifs.filter((k) => !(APPARITION[k] > yy));
    let motif = choix[(h >>> 4) % choix.length];
    if (motif === motifPrec && choix.length > 1) motif = choix[((h >>> 4) + 1) % choix.length];
    motifPrec = motif;
    let couloir = (h >>> 12) % 4;
    if (couloir === couloirPrec) couloir = (couloir + 1 + ((h >>> 20) % 3)) % 4;
    couloirPrec = couloir;
    out.push({
      cle: `${y}`,
      motif,
      x,
      haut: COULOIRS[couloir] + ((h >>> 14) % 6),
      taille: (discret ? 28 : 34) + ((h >>> 8) % 4) * 5,
      angle: ((h >>> 16) % 15) - 7,
      discret,
    });
  }
  return out;
}

// ---------- Vue ----------

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function borner(debut: number, fin: number, precision: Precision, bornes: Vue = { debut: DEBUT_FRISE, fin: FIN_FRISE }): Vue {
  const span = clamp(fin - debut, REGLAGES[precision].ecartMin, bornes.fin - bornes.debut);
  const c = (debut + fin) / 2;
  let d = c - span / 2;
  let f = c + span / 2;
  if (d < bornes.debut) {
    f += bornes.debut - d;
    d = bornes.debut;
  }
  if (f > bornes.fin) {
    d -= f - bornes.fin;
    f = bornes.fin;
  }
  return { debut: d, fin: f };
}

export const VUE_DE_BASE: Vue = { debut: DEBUT_FRISE, fin: FIN_FRISE };
