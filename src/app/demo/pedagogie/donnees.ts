import { chargerCartes } from "../../../../scripts/import-cartes";
import { lireCsv } from "../../../../scripts/csv";
import { cartePublique, type ChapitrePedagogique } from "@/lib/pedagogie";

// Avertissements de relecture, distincts des textes des cartes.
const limites: Record<string, string> = {
  "THM-027": "La sélection permet d’analyser les combats et la guerre industrielle. Les civils, le génocide des Arméniens et les sorties de guerre restent insuffisamment couverts.",
  "THM-028": "Ce lot couvre surtout la crise, le nazisme et juin 1940. Il ne couvre pas l’ensemble du thème, notamment le stalinisme, la Shoah et toute la guerre mondiale.",
  "THM-029": "La sélection se concentre sur l’Indochine. Elle permet d’étudier la décolonisation et la négociation, mais ne couvre pas tous les acteurs du monde bipolaire.",
  "THM-031": "La sélection analyse la coopération et les mobilités à travers le tunnel sous la Manche. Elle ne couvre pas les conflits mondiaux ni l’ensemble des transformations de l’Europe et de la France.",
  "THM-037": "L’Empire ottoman, la Russie et le numérique sont présents. Les langues, les routes de la Soie et les différentes formes de puissance américaine restent à compléter.",
  "THM-039": "La presse, les agences et l’audiovisuel sont présents. Internet, les médias en guerre et les lanceurs d’alerte restent à compléter.",
  "THM-040": "Les pouvoirs médiévaux, la séparation française, la Turquie et la partition de l’Inde sont présents. Les États-Unis et l’évolution des minorités religieuses en Inde restent à compléter.",
  "THM-041": "Les premiers exploits spatiaux et la coopération maritime sont présents. La Chine, les nouveaux acteurs et la puissance navale restent insuffisamment couverts.",
  "THM-042": "La diplomatie, l’ONU et les guerres du Golfe sont présents. Clausewitz, les guerres irrégulières et les tentatives de paix israélo-palestiniennes restent à compléter.",
  "THM-043": "La justice internationale et la commémoration sont présentes. Les mémoires de l’Algérie, les gacaca et les lieux de mémoire des génocides restent à compléter.",
  "THM-044": "Les usages politiques, le patrimoine immatériel, industriel et menacé sont présents. Le Parthénon, Paris et Venise restent à compléter.",
  "THM-045": "Les politiques américaines et la coopération internationale sont présentes. La forêt française et l’histoire longue des milieux et du climat restent à compléter.",
  "THM-046": "L’alphabétisation, la radioactivité et la cyberdéfense sont présentes. Le renseignement et les circulations de savoirs liées à l’Inde restent à compléter.",
};

// Lecture des fichiers du dépôt au build. Aucune connexion Supabase.
export function chargerDemoPedagogie(): ChapitrePedagogique[] {
  const cartes = chargerCartes();
  const themes = lireCsv("content/dataset-v18/kiffeurs-themes-v18.csv");
  return themes.map((theme) => ({
    id: theme.theme_id,
    titre: theme.theme_title,
    niveau: theme.level,
    lacune: limites[theme.theme_id],
    cartes: cartes.filter((c) => c.chapter_id === theme.theme_id)
      .sort((a, b) => a.sort_order - b.sort_order).map(cartePublique),
  }));
}
