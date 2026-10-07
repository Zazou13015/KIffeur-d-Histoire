import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargerCartes } from "./import-cartes";
import { lireCsv } from "./csv";

// Vérifie aussi les props RSC embarquées, pas seulement le texte visible.
const html = readFileSync(".next/server/app/demo/pedagogie.html", "utf8");
assert.doesNotMatch(html, /event_id|EVT-\d+|official_wording|date_status|date_precision|["\\]sources["\\]/);
assert(html.includes("Relecture éditoriale"));
const themes = lireCsv("content/dataset-v18/kiffeurs-themes-v18.csv");
const cartes = chargerCartes();
assert.equal(themes.length, 41);
assert.equal((html.match(/<option\b/g) ?? []).length, 41);
assert.equal((html.match(/<optgroup\b/g) ?? []).length, new Set(themes.map((t) => t.level)).size);
for (const theme of themes) assert(html.includes(theme.theme_id));
for (const carte of cartes) {
  assert(html.includes(carte.card_id), `Carte inaccessible : ${carte.card_id}`);
  for (const source of carte.sources) assert(!html.includes(source), `Source interne divulguée : ${carte.card_id}`);
}
console.log(`OK : démo statique, 41 chapitres, ${cartes.length} cartes embarquées, HTML/RSC sans event_id, sources ni métadonnées internes.`);
