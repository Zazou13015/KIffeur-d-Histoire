import { readFileSync, writeFileSync } from "node:fs";
import { lireCsv } from "./csv";
import { chargerCartes } from "./import-cartes";

const fichier = "content/pedagogie/relecture-v1.md";
const cartes = chargerCartes();
const themes = lireCsv("content/dataset-v18/kiffeurs-themes-v18.csv");
const liens = lireCsv("content/dataset-v18/kiffeurs-curriculum-links-v18.csv");
const texte = [
  "## Chapitres pilotes à relire", "",
  "Lot pilote de l’issue #21, en attente de validation éditoriale d’Antonin. Les dates sont celles du dataset v18 ; les statuts traditionnels, conventionnels, approximatifs ou discutés sont conservés. Aucune migration n’a été appliquée en production.", "",
  ...[...new Set(cartes.map((c) => c.chapter_id))].flatMap((id) => {
    const theme = themes.find((t) => t.theme_id === id)!;
    const groupe = cartes.filter((c) => c.chapter_id === id);
    const nombre = new Set(liens.filter((l) => l.theme_id === id && l.event_id).map((l) => l.event_id)).size;
    return [`### ${theme.level} — ${theme.theme_title}`, "",
      `**${id} · ${nombre} événements liés · ${groupe.length} cartes.**`, "",
      ...groupe.flatMap((c) => [`#### ${c.sort_order}. ${c.title}`, "", c.body, "", `**${c.takeaway}**`, "",
        `**Notions clés :** ${c.key_concepts.join(" · ")}`, "",
        `**Date / événement associé :** ${c.date_text} — ${c.event_id ?? "carte de contexte, sans événement unique"} (${c.date_precision}, ${c.date_status}).`, "",
        `**Rattachement v18 :** ${c.official_wording}`, "",
        `**Vérification de l’explication :** ${c.sources.map((url, i) => `[source ${i + 1}](${url})`).join(" · ")}`, ""]),
    ];
  }),
].join("\n");
if (process.argv.includes("--check")) {
  if (readFileSync(fichier, "utf8").replace(/\r\n/g, "\n") !== texte) throw new Error("Relecture désynchronisée : lancer npm run content:relecture-cartes");
  console.log("OK : relecture identique au CSV validé.");
} else {
  writeFileSync(fichier, texte, "utf8");
  console.log(`Relecture générée : ${fichier}`);
}
