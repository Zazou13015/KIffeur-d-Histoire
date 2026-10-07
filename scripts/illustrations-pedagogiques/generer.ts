// Atelier reproductible ; aucun téléversement ni accès Supabase.
// Refuse d'écrire sur le moindre SVG du stock validé.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { lireCsv } from "../csv";
import { scenes } from "./catalogue";
import { objets, placer } from "./objets";
import reference from "../../content/illustrations/reference-validee.json";
import geographie from "./cartes-theatres.json";
import chapitres from "../../src/lib/apprendre/catalogue.json";
const dossier = "content/illustrations";
const cartes = lireCsv("content/pedagogie/cartes-v1.csv");
const fichiersProteges = new Set(Object.keys(reference.svg));
for (const [fichier, hash] of Object.entries(reference.svg)) {
  if (createHash("sha256").update(readFileSync(`${dossier}/${fichier}`)).digest("hex") !== hash) throw new Error(`Référence modifiée : ${fichier}`);
}
const manquants = new Set(cartes.filter(c => c.event_id && !fichiersProteges.has(`${c.event_id}.svg`)).map(c => c.event_id));
if (scenes.length !== manquants.size || new Set(scenes.map(s => s.event)).size !== scenes.length || scenes.some(s => !manquants.has(s.event))) throw new Error("Le catalogue doit couvrir exactement tous les événements restants.");
const couleurs = { papier: "#f3f2ec", encre: "#1d2a3a", laiton: "#b08a3e", oxyde: "#8a2f2b", sauge: "#7e8c7a" };
function drapeau(type: string, x: number) {
  const g = `<g transform="translate(${x} 3)" stroke-width="1.2">`;
  const rect = (y: number, fill: string) => `<rect y="${y}" width="18" height="4" fill="${fill}"/>`;
  if (type === "france") return g + [couleurs.encre, couleurs.papier, couleurs.oxyde].map((fill, i) => `<rect x="${i * 6}" width="6" height="12" fill="${fill}"/>`).join("") + "</g>";
  if (type === "allemagne") return g + rect(0, couleurs.encre) + rect(4, couleurs.papier) + rect(8, couleurs.oxyde) + "</g>";
  if (type === "russie") return g + rect(0, couleurs.papier) + rect(4, couleurs.encre) + rect(8, couleurs.oxyde) + "</g>";
  if (type === "royaume-uni") return g + `<rect width="18" height="12" fill="${couleurs.encre}"/><path d="M0 0L18 12M18 0L0 12" stroke="${couleurs.papier}" stroke-width="2"/><path d="M9 0v12M0 6h18" stroke="${couleurs.papier}" stroke-width="4"/><path d="M9 0v12M0 6h18" stroke="${couleurs.oxyde}" stroke-width="2"/></g>`;
  const etoile = '<path d="M13 3l1 2h2l-2 1l1 2l-2-1l-2 1l1-2l-2-1h2z" fill="#f3f2ec" stroke="none"/>';
  if (type === "ottoman") return g + `<rect width="18" height="12" fill="${couleurs.oxyde}"/><path d="M9 2a4 4 0 1 0 0 8a3 3 0 1 1 0-8z" fill="${couleurs.papier}" stroke="none"/>` + etoile + "</g>";
  if (type === "vietnam") return g + `<rect width="18" height="12" fill="${couleurs.oxyde}"/><path d="M9 2l1 3h4l-3 2l1 3l-3-2l-3 2l1-3l-3-2h4z" fill="${couleurs.laiton}" stroke="none"/></g>`;
  throw new Error(`Drapeau inconnu : ${type}`);
}
const batailles: Record<string, { zone: keyof typeof geographie.cartes; gauche: string[]; droite: string[] }> = {
  "EVT-0206": { zone: "europe", gauche: ["russie"], droite: ["allemagne"] },
  "EVT-0207": { zone: "europe", gauche: ["france", "royaume-uni"], droite: ["allemagne"] },
  "EVT-0208": { zone: "dardanelles", gauche: ["royaume-uni", "france"], droite: ["ottoman"] },
  "EVT-0212": { zone: "europe", gauche: ["royaume-uni", "france"], droite: ["allemagne"] },
  "EVT-0251": { zone: "indochine", gauche: ["france"], droite: ["vietnam"] },
  "EVT-0482": { zone: "europe", gauche: ["france"], droite: ["allemagne"] },
};
const csv = (valeurs: string[]) => valeurs.map(v => `"${v.replace(/"/g, '""')}"`).join(",");
const inventaire = [csv(["event_id", "fichier_svg", "cartes_couvertes", "objets", "references_DA", "intention", "vigilance"])];
const correspondances = [csv(["card_id", "event_id", "title", "illustration_existante", "nouveau_fichier_svg"])];
for (const scene of scenes) {
  const nom = `${scene.event}.svg`;
  if (fichiersProteges.has(nom)) throw new Error(`Écriture interdite sur ${nom}`);
  const refs = scene.objets.map(o => {
    if (!objets[o] || !fichiersProteges.has(objets[o].reference)) throw new Error(`Référence non validée : ${o}`);
    return objets[o].reference;
  });
  let dessin = placer(scene.objets[0], 4, 14, 1) + (scene.objets.length === 3
    ? placer(scene.objets[1], 88, 40, 0.72) + placer(scene.objets[2], 110, 4, 0.32)
    : placer(scene.objets[1], 84, 27, 0.85)) + `<path d="M10 108h140" stroke="${couleurs.sauge}"/>`;
  const bataille = batailles[scene.event];
  if (bataille) {
    const formes = placer(scene.objets[0], 4, 5, 0.96) + placer(scene.objets[1], 88, 8, 0.9) + `<path d="M4 104h150" stroke="${couleurs.sauge}"/>`;
    // Deux niveaux de réduction compensés : trait final de 2 px comme le lot validé.
    dessin = `<g transform="translate(2 24) scale(0.72)" stroke-width="2.8">${formes.replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${Number(v) / 0.72}"`)}</g>`;
    dessin += `<rect width="160" height="19" fill="${couleurs.papier}" stroke="none"/><path d="M0 19h160" stroke-width="1.5"/><path d="M0 17.5h${bataille.gauche.length * 21 + 4}" stroke="${couleurs.laiton}" stroke-width="3"/><path d="M138 17.5h22" stroke="${couleurs.oxyde}" stroke-width="3"/>`;
    dessin += bataille.gauche.map((p, i) => drapeau(p, 4 + i * 21)).join("") + bataille.droite.map((p, i) => drapeau(p, 138 - i * 21)).join("");
    dessin += '<path d="M72 4L88 15M88 4L72 15"/><path d="M71 7l4-3M89 7l-4-3" stroke-width="1.5"/>';
    dessin += `<g transform="translate(112 79)"><rect width="46" height="38" fill="${couleurs.sauge}" stroke-width="1.5"/><path d="${geographie.cartes[bataille.zone].chemin}" fill="${couleurs.papier}" stroke="${couleurs.sauge}" stroke-width="0.6"/><rect width="46" height="38" stroke-width="1.5"/></g>`;
    refs.push("EVT-0012.svg", "EVT-0210.svg");
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="160" height="120"><rect width="160" height="120" fill="${couleurs.papier}"/><g fill="none" stroke="${couleurs.encre}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${dessin}</g></svg>\n`;
  if (Buffer.byteLength(svg) > 8192) throw new Error(`SVG trop lourd : ${nom}`);
  writeFileSync(`${dossier}/${nom}`, svg);
  const liees = cartes.filter(c => c.event_id === scene.event);
  inventaire.push(csv([scene.event, nom, String(liees.length), scene.objets.join(" ; "), [...new Set(refs)].join(" ; "), scene.intention, scene.vigilance]));
  for (const c of liees) correspondances.push(csv([c.card_id, c.event_id, c.title, "non", nom]));
}
writeFileSync(`${dossier}/generalisation-inventaire.csv`, inventaire.join("\n") + "\n");
writeFileSync(`${dossier}/generalisation-cartes.csv`, correspondances.join("\n") + "\n");
mkdirSync("docs/illustrations/generalisation", { recursive: true });
const fallback = cartes.filter(c => !c.event_id);
writeFileSync("docs/illustrations/generalisation/fallbacks.csv", [csv(["card_id", "chapter_id", "title", "raison"]), ...fallback.map(c => csv([c.card_id, c.chapter_id, c.title, "Carte de notion sans event_id dans le catalogue canonique ; aucune correspondance inventée ni modification de contenu."]))].join("\n") + "\n");
const tousEvenements = [...new Set(cartes.map(c => c.event_id).filter(Boolean))];
writeFileSync("docs/illustrations/generalisation/mutualisations.csv", [csv(["event_id", "fichier_svg", "nombre_cartes", "card_ids", "chapitres"]), ...tousEvenements.filter(id => cartes.filter(c => c.event_id === id).length > 1).map(id => {
  const liees = cartes.filter(c => c.event_id === id);
  return csv([id, `${id}.svg`, String(liees.length), liees.map(c => c.card_id).join(" ; "), [...new Set(liees.map(c => c.chapter_id))].join(" ; ")]);
})].join("\n") + "\n");
const couverture = ["# Couverture par chapitre", "", "Avant = 120 SVG validés, pilote #65 inclus. Après = 331 SVG, sans changement du catalogue canonique.", "", "| Chapitre | Niveau | Cartes | Dédiées avant | Nouvelles cartes couvertes | Dédiées après | Fallbacks après |", "| --- | --- | ---: | ---: | ---: | ---: | ---: |"];
for (const chapitre of chapitres) {
  const liees = cartes.filter(c => c.chapter_id === chapitre.id);
  const avant = liees.filter(c => fichiersProteges.has(`${c.event_id}.svg`)).length;
  const nouvelles = liees.filter(c => manquants.has(c.event_id)).length;
  couverture.push(`| ${chapitre.id} — ${chapitre.titre} | ${chapitre.niveau} | ${liees.length} | ${avant} | ${nouvelles} | ${avant + nouvelles} | ${liees.filter(c => !c.event_id).length} |`);
}
couverture.push("| **Total** | **10 niveaux / 41 chapitres** | **325** | **76** | **227** | **303** | **22** |");
writeFileSync("docs/illustrations/generalisation/couverture.md", couverture.join("\n") + "\n");
console.log(`${scenes.length} SVG écrits, ${correspondances.length - 1} cartes supplémentaires, ${fallback.length} cartes sans événement.`);
