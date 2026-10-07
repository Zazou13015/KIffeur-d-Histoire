"use server";

import { redirect } from "next/navigation";
import { startGame } from "@/app/solo/actions";
import type { SoloDifficulty } from "@/lib/game/solo";

const DIFFICULTES: SoloDifficulty[] = ["YEAR", "MONTH", "DAY"];

// Lance une partie solo de 10 questions à la difficulté choisie, puis ouvre l'écran de partie.
// Le formulaire vient de /partie/nouvelle et du bouton « Rejouer » du bilan.
export async function lancer(formData: FormData) {
  const demandee = String(formData.get("difficulte"));
  const difficulty = DIFFICULTES.find((d) => d === demandee) ?? "YEAR";
  let destination: string;
  try {
    const game = await startGame({ difficulty });
    destination = `/partie/${game.game_id}?n=${game.question_count}`;
  } catch (e) {
    const profil = e instanceof Error && e.message.includes("pseudo");
    destination = profil ? "/profil?next=%2Fpartie%2Fnouvelle" : "/partie/nouvelle?erreur=1";
  }
  // redirect() lève une exception : il reste hors du try.
  redirect(destination);
}
