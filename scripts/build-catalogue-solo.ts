// Construit src/lib/solo/catalogue.json depuis le dataset v18 : les packs prêts à jouer, les thèmes
// et, pour chaque choix, le nombre d'événements jouables par difficulté (pour griser ce qui ne remplit pas 10 questions).
// Aucune date n'y figure : seulement des identifiants, des libellés et des décomptes.
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
const deListe = (ids: Iterable<string>) => compter([...new Set(ids)].flatMap((id) => { const e = parId.get(id); return e ? [e] : []; }));

const contenuPacks = new Map<string, string[]>();
for (const r of csv("ready-collection-events")) contenuPacks.set(r.collection_id, [...(contenuPacks.get(r.collection_id) ?? []), r.event_id]);
const packs = csv("ready-collections")
  .filter((p) => p.active === "TRUE" && p.ready_to_play === "TRUE")
  .map((p) => ({ id: p.collection_id, titre: p.title, description: p.description, n: deListe(contenuPacks.get(p.collection_id) ?? []) }));

const tagsEvenements = new Map<string, string[]>();
for (const r of csv("event-tags")) tagsEvenements.set(r.tag_id, [...(tagsEvenements.get(r.tag_id) ?? []), r.event_id]);
const themes = csv("tags")
  .filter((t) => t.tag_type === "SEMANTIC_TOPIC" && t.active === "TRUE")
  .map((t) => ({ id: t.tag_id, nom: t.name, n: deListe(tagsEvenements.get(t.tag_id) ?? []) }))
  .filter((t) => t.n.YEAR >= 10)
  .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

const periodes = Object.fromEntries(
  PERIODES.map((p) => [
    p.id,
    compter(evenements.filter((e) => (p.de == null || Number(e.start_year) >= p.de) && (p.a == null || Number(e.start_year) <= p.a))),
  ]),
);

const catalogue = { general: compter(evenements), packs, themes, periodes };
writeFileSync(join(import.meta.dirname, "..", "src", "lib", "solo", "catalogue.json"), `${JSON.stringify(catalogue, null, 1)}\n`);
console.log(`${packs.length} packs, ${themes.length} thèmes, ${evenements.length} événements jouables.`);
