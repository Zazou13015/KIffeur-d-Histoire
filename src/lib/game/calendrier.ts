// Découpage du temps pour le calendrier de saisie : siècle, décennie, année.
// Il n'y a pas d'année 0 : le 1er siècle ap. J.-C. va de 1 à 100, le 1er siècle av. J.-C. de 100 av. à 1 av.
// En interne on compte en années astronomiques (l'année 0 existe) pour que les découpages tombent juste.

import { ANNEE_MAX, ANNEE_MIN } from "./saisie";

export type Ere = "ap" | "av";

export type Tranche = {
  /** Années historiques (jamais 0), du début à la fin de la tranche, dans l'ordre du temps. */
  debut: number;
  fin: number;
};

export type Siecle = Tranche & { numero: number; ere: Ere };

const versHistorique = (astro: number) => (astro <= 0 ? astro - 1 : astro);
const versAstro = (annee: number) => (annee < 0 ? annee + 1 : annee);

const ROMAINS: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function romain(n: number): string {
  let reste = n;
  let out = "";
  for (const [valeur, signe] of ROMAINS) {
    while (reste >= valeur) {
      out += signe;
      reste -= valeur;
    }
  }
  return out;
}

export const libelleSiecle = (s: Siecle) => `${romain(s.numero)}${s.numero === 1 ? "er" : "e"} siècle`;

// Dans la plage jouable de la frise, seulement.
const dansLaFrise = (annee: number) => annee >= ANNEE_MIN && annee <= ANNEE_MAX;

function tranche(astroDebut: number, astroFin: number): Tranche | null {
  const debut = Math.max(versHistorique(astroDebut), ANNEE_MIN);
  const fin = Math.min(versHistorique(astroFin), ANNEE_MAX);
  return dansLaFrise(debut) && dansLaFrise(fin) && versAstro(debut) <= versAstro(fin) ? { debut, fin } : null;
}

/** Siècles de l'ère choisie, dans l'ordre du temps (le plus ancien d'abord). */
export function siecles(ere: Ere): Siecle[] {
  const out: Siecle[] = [];
  const plusGrand = Math.ceil(-versAstro(ANNEE_MIN) / 100) + 1;
  if (ere === "ap") {
    for (let n = 1; (n - 1) * 100 + 1 <= ANNEE_MAX; n++) {
      const t = tranche((n - 1) * 100 + 1, n * 100);
      if (t) out.push({ ...t, numero: n, ere });
    }
  } else {
    for (let n = plusGrand; n >= 1; n--) {
      const t = tranche(-n * 100 + 1, -(n - 1) * 100);
      if (t) out.push({ ...t, numero: n, ere });
    }
  }
  return out;
}

/** Dix décennies par siècle (la dernière peut être raccourcie en bout de frise). */
export function decennies(s: Tranche): Tranche[] {
  return decouper(s, 10);
}

/** Les années d'une décennie, dans l'ordre du temps. */
export function annees(d: Tranche): number[] {
  const out: number[] = [];
  for (let a = versAstro(d.debut); a <= versAstro(d.fin); a++) out.push(versHistorique(a));
  return out;
}

function decouper(t: Tranche, taille: number): Tranche[] {
  const out: Tranche[] = [];
  const fin = versAstro(t.fin);
  for (let a = versAstro(t.debut); a <= fin; a += taille) {
    out.push({ debut: versHistorique(a), fin: versHistorique(Math.min(a + taille - 1, fin)) });
  }
  return out;
}

const texteAnnee = (a: number) => (a < 0 ? `${-a}` : `${a}`);

/** « 1781–1790 » ou « 50–41 av. J.-C. » (les années av. J.-C. se lisent à rebours). */
export function libelleTranche(t: Tranche): string {
  if (t.debut < 0 && t.fin < 0) return `${texteAnnee(t.debut)}–${texteAnnee(t.fin)} av. J.-C.`;
  if (t.debut < 0) return `${-t.debut} av. – ${t.fin} ap. J.-C.`;
  return `${t.debut}–${t.fin}`;
}
