import { chargerCartes } from "../../../../scripts/import-cartes";
import { lireCsv } from "../../../../scripts/csv";
import { cartePublique, type ChapitrePedagogique } from "@/lib/pedagogie";

// Lecture des fichiers du dépôt au build. Aucune connexion Supabase.
export function chargerDemoPedagogie(): ChapitrePedagogique[] {
  const cartes = chargerCartes();
  const themes = lireCsv("content/dataset-v18/kiffeurs-themes-v18.csv");
  const niveaux = ["6e", "3e", "Seconde", "Terminale"];
  return ["THM-005", "THM-016", "THM-020", "THM-028"].map((id, i) => ({
    id,
    titre: themes.find((t) => t.theme_id === id)!.theme_title,
    niveau: niveaux[i],
    cartes: cartes.filter((c) => c.chapter_id === id)
      .sort((a, b) => a.sort_order - b.sort_order).map(cartePublique),
  }));
}
