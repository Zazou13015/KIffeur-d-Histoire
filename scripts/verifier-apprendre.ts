import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPITRES, cheminChapitre } from "../src/lib/apprendre/catalogue";
import { chargerCartes } from "./import-cartes";

const cartes = chargerCartes();
const racine = ".next/server/app";
const accueil = readFileSync(`${racine}/apprendre.html`, "utf8");
const prive = /event_id|EVT-\d+|official_wording|date_status|date_precision|["\\]sources["\\]/;
assert.doesNotMatch(accueil, prive);
assert(!accueil.includes('card_id'), "L’accueil ne charge aucune carte");
let total = 0;
for (const chapitre of CHAPITRES) {
  const chemin = cheminChapitre(chapitre);
  assert(accueil.includes(chemin), `Lien absent : ${chemin}`);
  const html = readFileSync(`${racine}${chemin}.html`, "utf8");
  const rsc = readFileSync(`${racine}${chemin}.rsc`, "utf8");
  assert.doesNotMatch(html + rsc, prive);
  assert(html.includes("Me tester sur ce chapitre"));
  const attendues = cartes.filter((c) => c.chapter_id === chapitre.id);
  const ids = new Set((html + rsc).match(/CARD-[a-z0-9-]+/g));
  assert.deepEqual([...ids].sort(), attendues.map((c) => c.card_id).sort(), `Seulement les cartes du chapitre ${chapitre.id}`);
  for (const c of attendues) for (const source of c.sources) assert(!html.includes(source) && !rsc.includes(source), `Source divulguée : ${c.card_id}`);
  total += attendues.length;
}
assert.equal(CHAPITRES.length, 41);
assert.equal(total, 325);
const routes = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8")).routes;
assert(routes["/apprendre"]);
for (const c of CHAPITRES) assert.equal(routes[cheminChapitre(c)].initialRevalidateSeconds, 3600);
console.log("OK : /apprendre et 41 chapitres statiques, 325 cartes, cache 3600 s, HTML/RSC sans event_id, sources, chemins EVT ou métadonnées internes. Chaque page n’embarque que ses propres cartes.");
