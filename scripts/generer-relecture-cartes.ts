import { readFileSync, writeFileSync } from "node:fs";
import { lireCsv } from "./csv";
import { chargerCartes } from "./import-cartes";

const fichier = "content/pedagogie/relecture-v1.md";
const cartes = chargerCartes();
const themes = lireCsv("content/dataset-v18/kiffeurs-themes-v18.csv");
const liens = lireCsv("content/dataset-v18/kiffeurs-curriculum-links-v18.csv");
const texte = [
  "## Cartes pédagogiques — relecture des 41 chapitres", "",
  `Le pilote de 37 cartes a été validé par Antonin. La généralisation comporte ${cartes.length} cartes dans ${themes.length} chapitres, en attente de sa relecture finale. Les dates et statuts des événements reprennent exactement le canon v18. Les périodes de contexte ne reçoivent aucune borne inventée. Aucune migration ni donnée appliquée en production.`, "",
  "Les sources et rattachements sont des métadonnées internes ; aucune source n’est envoyée dans la projection publique ou la démo. Consulter [le rapport des lacunes](lacunes-v1.md) avant d’interpréter les cartes comme une couverture exhaustive.", "",
  "### Accès par niveau et chapitre", "",
  ...themes.map((theme) => `- [${theme.level} · ${theme.theme_id} — ${theme.theme_title}](#${theme.theme_id.toLowerCase()}) · ${cartes.filter((c) => c.chapter_id === theme.theme_id).length} cartes`), "",
  ...[...new Set(cartes.map((c) => c.chapter_id))].flatMap((id) => {
    const theme = themes.find((t) => t.theme_id === id)!;
    const groupe = cartes.filter((c) => c.chapter_id === id);
    const nombre = new Set(liens.filter((l) => l.theme_id === id && l.event_id).map((l) => l.event_id)).size;
    return [`<a id="${id.toLowerCase()}"></a>`, "", `### ${theme.level} — ${theme.theme_title}`, "",
      `**${id} · ${nombre} événements liés · ${groupe.length} cartes.**`, "",
      ...groupe.flatMap((c) => [`#### ${c.sort_order}. ${c.title}`, "", "**CONTENU JOUEUR**", "",
        `**Date / période :** ${c.date_text}`, "", c.body, "", `**${c.takeaway}**`, "",
        `**Notions clés :** ${c.key_concepts.join(" · ")}`, "",
        "**MÉTADONNÉES DE RELECTURE**", "",
        `**Identifiants :** ${c.card_id} · ${c.chapter_id} · ${c.event_id ?? "contexte, sans événement unique"}.`, "",
        `**Datation interne :** ${c.date_precision}, ${c.date_status} ; début ${[c.start_year, c.start_month, c.start_day].map((v) => v ?? "∅").join(" / ")} ; fin ${[c.end_year, c.end_month, c.end_day].map((v) => v ?? "∅").join(" / ")}.`, "",
        `**Rattachement v18 :** ${c.official_wording || "cellule canonique vide (rattachement complémentaire conservé sans invention)"}`, "",
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
