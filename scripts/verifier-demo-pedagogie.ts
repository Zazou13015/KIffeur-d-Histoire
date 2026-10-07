import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chargerCartes } from "./import-cartes";

// Vérifie aussi les props RSC embarquées, pas seulement le texte visible.
const html = readFileSync(".next/server/app/demo/pedagogie.html", "utf8");
assert.doesNotMatch(html, /event_id|EVT-\d+|official_wording|date_status|date_precision/);
assert(html.includes("Démonstration · cartes pédagogiques"));
for (const id of ["THM-005", "THM-016", "THM-020", "THM-028"]) assert(html.includes(id));
for (const carte of chargerCartes()) assert(html.includes(carte.card_id), `Carte inaccessible : ${carte.card_id}`);
console.log("OK : démo statique, 4 chapitres, 37 cartes embarquées, HTML/RSC sans event_id ni métadonnées internes.");
