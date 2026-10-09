// Construit src/lib/solo/catalogue.json depuis le dataset v18 : les packs prêts à jouer, les thèmes
// et, pour chaque choix, le nombre d'événements jouables par difficulté (pour griser ce qui ne remplit pas 10 questions).
// Aucune date d'événement n'y figure : des identifiants, des libellés, des décomptes et, pour cadrer
// la frise, l'étendue de chaque choix arrondie à la dizaine d'années avec 10 ans de marge.
// Usage : npm run content:catalogue-solo
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { lireCsv, type LigneCsv } from "./csv";
import { PERIODES } from "../src/lib/solo/periodes";

const dossier = join(import.meta.dirname, "..", "content", "dataset-v18");
const csv = (nom: string) => lireCsv(join(dossier, `kiffeurs-${nom}-v18.csv`));
type Comptes = { YEAR: number; MONTH: number; DAY: number };

// Mêmes règles que histoire.start_game : jouable, mode automatique, mois et jour présents selon la difficulté.
const evenements = csv("events").filter(
  (e) => e.playable === "TRUE" && ["YEAR", "MONTH", "DAY", "RANGE"].includes(e.playable_mode) && e.start_year !== "",
);
const parId = new Map(evenements.map((e) => [e.event_id, e]));
function compter(liste: LigneCsv[]): Comptes {
  return {
    YEAR: liste.length,
    MONTH: liste.filter((e) => e.start_month !== "").length,
    DAY: liste.filter((e) => e.start_month !== "" && e.start_day !== "").length,
  };
}
const deIds = (ids: Iterable<string>) => [...new Set(ids)].flatMap((id) => { const e = parId.get(id); return e ? [e] : []; });
const deListe = (ids: Iterable<string>) => compter(deIds(ids));

// Étendue de la frise pour un choix, en années astronomiques (positions `t` de la frise, 1 av. J.-C. = 0).
const DEBUT_FRISE = -3500, FIN_FRISE = 2030, LARGEUR_MIN = 30;
function bornes(liste: LigneCsv[]): [number, number] {
  if (!liste.length) return [DEBUT_FRISE, FIN_FRISE];
  const astro = liste.map((e) => { const a = Number(e.start_year); return a < 0 ? a + 1 : a; });
  let debut = Math.max(DEBUT_FRISE, Math.floor((Math.min(...astro) - 10) / 10) * 10);
  let fin = Math.min(FIN_FRISE, Math.ceil((Math.max(...astro) + 11) / 10) * 10);
  if (fin - debut < LARGEUR_MIN) {
    const manque = LARGEUR_MIN - (fin - debut);
    debut -= Math.ceil(manque / 2);
    fin += Math.floor(manque / 2);
  }
  return [debut, fin];
}

const contenuPacks = new Map<string, string[]>();
for (const r of csv("ready-collection-events")) contenuPacks.set(r.collection_id, [...(contenuPacks.get(r.collection_id) ?? []), r.event_id]);
const packs = csv("ready-collections")
  .filter((p) => p.active === "TRUE" && p.ready_to_play === "TRUE")
  .map((p) => ({ id: p.collection_id, titre: p.title, description: p.description, n: deListe(contenuPacks.get(p.collection_id) ?? []), b: bornes(deIds(contenuPacks.get(p.collection_id) ?? [])) }));

const tagsEvenements = new Map<string, string[]>();
for (const r of csv("event-tags")) tagsEvenements.set(r.tag_id, [...(tagsEvenements.get(r.tag_id) ?? []), r.event_id]);
const themes = csv("tags")
  .filter((t) => t.tag_type === "SEMANTIC_TOPIC" && t.active === "TRUE")
  .map((t) => ({ id: t.tag_id, nom: t.name, n: deListe(tagsEvenements.get(t.tag_id) ?? []), b: bornes(deIds(tagsEvenements.get(t.tag_id) ?? [])) }))
  .filter((t) => t.n.YEAR >= 10)
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

const dansPeriode = (p: (typeof PERIODES)[number]) =>
  evenements.filter((e) => (p.de == null || Number(e.start_year) >= p.de) && (p.a == null || Number(e.start_year) <= p.a));
const periodes = Object.fromEntries(PERIODES.map((p) => [p.id, compter(dansPeriode(p))]));
const bornesPeriodes = Object.fromEntries(PERIODES.map((p) => [p.id, bornes(dansPeriode(p))]));

// Chapitres : mêmes liens que l'import (curriculum-links, doublons redirigés vers l'identifiant canonique).
const redirection = new Map(csv("event-redirects").map((r) => [r.old_event_id, r.canonical_event_id]));
const contenuChapitres = new Map<string, string[]>();
for (const l of csv("curriculum-links")) {
  if (!l.theme_id || !l.event_id) continue;
  const id = redirection.get(l.event_id) ?? l.event_id;
  contenuChapitres.set(l.theme_id, [...(contenuChapitres.get(l.theme_id) ?? []), id]);
}
// Test d'un chapitre (#23) : seulement les événements de ses cartes pédagogiques, ce que le joueur vient d'apprendre.
const cartesChapitres = new Map<string, string[]>();
for (const c of lireCsv(join(import.meta.dirname, "..", "content", "pedagogie", "cartes-v1.csv"))) {
  if (!c.event_id) continue;
  cartesChapitres.set(c.chapter_id, [...(cartesChapitres.get(c.chapter_id) ?? []), redirection.get(c.event_id) ?? c.event_id]);
}
const chapitres = Object.fromEntries([...contenuChapitres].sort().map(([id, ids]) => {
  const test = cartesChapitres.get(id) ?? [];
  return [id, { n: deListe(ids), b: bornes(deIds(ids)), t: deListe(test), tb: bornes(deIds(test)) }];
}));

const catalogue = { general: compter(evenements), packs, themes, periodes, bornesPeriodes, chapitres };
writeFileSync(join(import.meta.dirname, "..", "src", "lib", "solo", "catalogue.json"), `${JSON.stringify(catalogue, null, 1)}\n`);
console.log(`${packs.length} packs, ${themes.length} thèmes, ${evenements.length} événements jouables.`);
