// Lecture d'une date tapée au clavier : « 1918 », « 11/1918 », « 11 novembre 1918 », « -44 », « 44 av. J.-C. »…
// Sans DOM, pour être testée. Le résultat est le même objet que celui de la frise et du calendrier.

import { MOIS, type HistoricDate, type Precision } from "./dates";
import { DEBUT_FRISE, FIN_FRISE, joursDansMois } from "./frise";

export type LectureDate = { ok: true; date: HistoricDate } | { ok: false; erreur: string };

const echec = (erreur: string): LectureDate => ({ ok: false, erreur });

const SANS_ACCENT = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const NOMS_MOIS = MOIS.map(SANS_ACCENT);

// « sept. », « janv », « fevrier » : au moins trois lettres, et une seule possibilité.
function lireMois(mot: string): number | null | "ambigu" {
  const m = mot.replace(/\.$/, "");
  if (m.length < 3) return null;
  const candidats = NOMS_MOIS.map((nom, i) => (nom.startsWith(m) ? i + 1 : 0)).filter(Boolean);
  if (candidats.length === 1) return candidats[0];
  return candidats.length > 1 ? "ambigu" : null;
}

const AVANT = /\b(?:av\.?\s*j\.?\s*-?\s*c\.?|avant\s+j(?:esus)?\.?\s*-?\s*c(?:hrist)?\.?|b\.?\s*c\.?)(?![a-z])/;
const APRES = /\b(?:ap\.?r?\.?\s*j\.?\s*-?\s*c\.?|apres\s+j(?:esus)?\.?\s*-?\s*c(?:hrist)?\.?|a\.?\s*d\.?)(?![a-z])/;

export const ANNEE_MIN = DEBUT_FRISE;
export const ANNEE_MAX = FIN_FRISE - 1;

/**
 * Lit une date tapée à la main.
 * On n'exige que la précision de la question : « 1918 » suffit en facile, « 11/1918 » en moyen,
 * « 11/11/1918 » en difficile. Ce qui est tapé en trop est vérifié puis ignoré.
 */
export function lireDate(texte: string, precision: Precision): LectureDate {
  let t = SANS_ACCENT(texte.toLowerCase()).replace(/[−–—]/g, "-").replace(/(\d)\s*(?:er|ere|e|eme)\b/g, "$1").trim();
  if (!t) return echec("Tapez une date.");

  let ere: "av" | "ap" | null = null;
  if (AVANT.test(t)) {
    ere = "av";
    t = t.replace(AVANT, " ");
  } else if (APRES.test(t)) {
    ere = "ap";
    t = t.replace(APRES, " ");
  }

  // Un « - » n'est un signe moins que devant un nombre, en début de saisie ou après un séparateur.
  const morceaux = t.match(/(?<=^|[\s/.,])-\d+|\d+|[a-z]+\.?/g);
  const reste = t.replace(/(?<=^|[\s/.,])-\d+|\d+|[a-z]+\.?|[\s/.,-]/g, "");
  if (!morceaux || reste) return echec("Je ne comprends pas cette date.");

  const nombres: number[] = [];
  let negatif = false;
  let mois: number | null = null;
  for (const morceau of morceaux) {
    if (/^-?\d/.test(morceau)) {
      if (morceau.startsWith("-")) {
        // Seule l'année peut être précédée d'un « - » ; on la repère plus bas par sa place.
        negatif = true;
      }
      nombres.push(Math.abs(parseInt(morceau, 10)));
      continue;
    }
    const m = lireMois(morceau);
    if (m === "ambigu") return echec(`« ${morceau} » peut désigner deux mois : écrivez-le en entier.`);
    if (m === null) return echec(`Je ne connais pas « ${morceau} ».`);
    if (mois !== null) return echec("Un seul mois à la fois.");
    mois = m;
  }

  // Place de chaque nombre selon ce qui est écrit.
  let jour: number | null = null;
  let annee: number;
  if (mois !== null) {
    if (nombres.length === 0) return echec("Il manque l'année.");
    if (nombres.length > 2) return echec("Trop de nombres : jour, mois et année suffisent.");
    annee = nombres[nombres.length - 1];
    if (nombres.length === 2) jour = nombres[0];
  } else if (nombres.length === 1) {
    annee = nombres[0];
  } else if (nombres.length === 2) {
    mois = nombres[0];
    annee = nombres[1];
  } else if (nombres.length === 3) {
    [jour, mois, annee] = nombres;
  } else {
    return echec(nombres.length === 0 ? "Il manque l'année." : "Trop de nombres : jour, mois et année suffisent.");
  }

  if (negatif && ere === "ap") return echec("« - » et « ap. J.-C. » se contredisent.");
  const avantJC = negatif || ere === "av";
  if (annee === 0) return echec("Il n'y a pas d'année 0 : 1 av. J.-C. est suivi de 1 ap. J.-C.");
  const year = avantJC ? -annee : annee;
  if (year < ANNEE_MIN || year > ANNEE_MAX) {
    return echec(`La frise va de ${-ANNEE_MIN} av. J.-C. à ${ANNEE_MAX}.`);
  }
  if (mois !== null && (mois < 1 || mois > 12)) return echec("Le mois doit être entre 1 et 12.");
  if (jour !== null && mois !== null && (jour < 1 || jour > joursDansMois(year, mois))) {
    return echec(`Ce mois n'a pas ${jour} jours.`);
  }

  const date: HistoricDate = { year };
  if (precision !== "annee") {
    if (mois === null) return echec("Précisez aussi le mois : par exemple « novembre 1918 ».");
    date.month = mois;
  }
  if (precision === "jour") {
    if (jour === null) return echec("Précisez aussi le jour : par exemple « 11 novembre 1918 ».");
    date.day = jour;
  }
  return { ok: true, date };
}
