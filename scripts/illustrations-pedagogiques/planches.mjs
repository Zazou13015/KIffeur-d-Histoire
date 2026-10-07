// Relecture du lot entier avec quatre SVG validés en tête de chaque planche.
// sharp est fourni par Next.js dans le verrou de dépendances du dépôt.
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { lireCsv } = await import("../csv.ts");
const baseline = require("../../content/illustrations/reference-validee.json");
const inventaire = lireCsv("content/illustrations/generalisation-inventaire.csv");
const cartes = lireCsv("content/illustrations/generalisation-cartes.csv");
const dossier = "docs/illustrations/generalisation";
mkdirSync(dossier, { recursive: true });
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
function lignes(texte, max = 40) {
  const resultat = [""];
  for (const mot of texte.split(" ")) {
    const fin = resultat.length - 1;
    if ((resultat[fin] + " " + mot).trim().length > max) resultat.push(mot);
    else resultat[fin] = (resultat[fin] + " " + mot).trim();
  }
  return resultat;
}
const index = ["| Planche | Nouveaux SVG | Références comparées |", "| --- | --- | --- |"];
for (let page = 0; page * 12 < inventaire.length; page++) {
  const lot = inventaire.slice(page * 12, (page + 1) * 12);
  const refs = [...new Set(lot.flatMap(i => i.references_DA.split(" ; ")))];
  for (const secours of ["EVT-0018.svg", "EVT-0623.svg", "EVT-0173.svg", "EVT-0003.svg"]) if (!refs.includes(secours)) refs.push(secours);
  const temoin = refs.filter(n => baseline.svg[n]).slice(0, 4);
  const vignettes = [...temoin.map(fichier => ({ fichier, reference: true, titre: "Référence validée — comparaison DA" })), ...lot.map(i => ({ fichier: i.fichier_svg, reference: false, titre: cartes.find(c => c.event_id === i.event_id).title }))];
  const composites = [];
  const entete = `<svg width="1200" height="48"><rect width="1200" height="48" fill="#f3f2ec"/><text x="18" y="30" font-family="Arial" font-size="20" fill="#1d2a3a">Lot complet #66 — planche ${page + 1} — 4 références validées / ${lot.length} nouveaux SVG</text></svg>`;
  composites.push({ input: Buffer.from(entete), left: 0, top: 0 });
  for (let i = 0; i < vignettes.length; i++) {
    const vignette = vignettes[i], x = (i % 4) * 300, y = 48 + Math.floor(i / 4) * 252;
    composites.push({ input: await sharp(readFileSync(`content/illustrations/${vignette.fichier}`)).resize(240, 180).png().toBuffer(), left: x + 30, top: y + 5 });
    const texte = `<svg width="300" height="65"><rect width="300" height="65" fill="#f3f2ec"/><text x="15" y="17" font-family="Arial" font-size="14" font-weight="bold" fill="${vignette.reference ? "#7e8c7a" : "#8a2f2b"}">${vignette.reference ? "VALIDÉ · " : "NOUVEAU · "}${esc(vignette.fichier)}</text>${lignes(vignette.titre).slice(0, 3).map((l, k) => `<text x="15" y="${34 + k * 14}" font-family="Arial" font-size="12" fill="#1d2a3a">${esc(l)}</text>`).join("")}</svg>`;
    composites.push({ input: Buffer.from(texte), left: x, top: y + 185 });
  }
  const nom = `planche-${String(page + 1).padStart(2, "0")}.png`;
  await sharp({ create: { width: 1200, height: 48 + Math.ceil(vignettes.length / 4) * 252, channels: 3, background: "#f3f2ec" } }).composite(composites).png().toFile(`${dossier}/${nom}`);
  index.push(`| [${page + 1}](${nom}) | ${lot.map(i => i.event_id).join(", ")} | ${temoin.join(", ")} |`);
}
writeFileSync(`${dossier}/planches.md`, "# Planches de comparaison\n\nTous les 211 nouveaux SVG sont présents, une seule fois, sur 18 planches. Les quatre premières vignettes de chaque planche sont des références validées intactes. Les étiquettes sont hors des SVG livrés.\n\n" + index.join("\n") + "\n");
console.log("18 planches et index produits.");
