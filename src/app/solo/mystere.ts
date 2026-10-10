"use server";

import { startGame } from "./actions";
import { ecrireChoix, filtresDepuis, lireChoix } from "@/lib/solo/choix";
import { choixGagnant, choixMystere, destinationMystere, type TirageMystere } from "@/lib/solo/mystere";

export async function preparerMystere(texte: string): Promise<{ tirage: TirageMystere } | { erreur: string; profil?: string }> {
  const choix = lireChoix(new URLSearchParams(texte));
  if (!choix || choix.mode === "scolaire" || choix.test) return { erreur: "Choix de partie invalide." };
  try {
    // Créer l'instantané avant l'animation. Aucune question/chrono ne démarre ici.
    const game = await startGame(filtresDepuis(choixMystere(choix)));
    if (!game.mystery) return { erreur: "Le thème mystère est momentanément indisponible." };
    const resolu = choixGagnant(choix, game.mystery.winner);
    return { tirage: { gagnant: game.mystery.winner, candidats: game.mystery.candidates,
      choix: ecrireChoix(resolu), destination: destinationMystere(game.game_id, game.question_count, resolu) } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("pseudo")) return { erreur: "Choisis ton pseudo KFFR avant de jouer.",
      profil: `/profil?next=${encodeURIComponent(choix.sens ? "/inverse" : "/solo")}` };
    return { erreur: message.includes("Pas assez")
      ? "Aucun thème ne contient assez de questions pour ces réglages. Essaie une autre longueur ou un autre niveau."
      : "Le thème mystère est momentanément indisponible. Réessaie dans un instant." };
  }
}
