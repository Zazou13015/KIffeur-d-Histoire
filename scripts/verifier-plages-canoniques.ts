import { auditerPlagesCanoniques } from "./audit-plages-canoniques";
import { lireCsv } from "./csv";

// Lecture des fichiers du dépôt seulement : aucun réseau, import ou accès SQL.
const evenements = lireCsv("content/dataset-v18/kiffeurs-events-v18.csv");
const anomalies = auditerPlagesCanoniques(evenements);
console.log(`Audit indicatif : ${evenements.length} événements lus, ${anomalies.length} plage(s) textuelle(s) représentée(s) par un point.`);
for (const e of anomalies) {
  console.log(`${e.event_id} — ${e.title_canonical} : date_text=${JSON.stringify(e.date_text)} ; start=${[e.start_year, e.start_month, e.start_day].join("/")} ; end=null ; precision=${e.precision} ; status=${e.date_status}`);
}
console.log("Audit conservateur et non exhaustif : signalements à vérifier avant #22, aucune correction automatique. Les dates secondaires, siècles, décennies et bornes ambiguës ne sont pas analysés.");
// Le rapport reste consultable en CI malgré les anomalies déjà connues.
// --strict permet de bloquer un usage futur qui exige leur résolution.
if (process.argv.includes("--strict") && anomalies.length) process.exitCode = 1;
