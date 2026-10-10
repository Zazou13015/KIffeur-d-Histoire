"use server";

import { redirect } from "next/navigation";
import { startGame } from "@/app/solo/actions";
import { cheminChapitre } from "@/lib/apprendre/catalogue";
import { CHAPITRES, ecrireChoix, filtresDepuis, lireChoix } from "@/lib/solo/choix";
import { choixGagnant } from "@/lib/solo/mystere";

// Lance une partie solo depuis /solo, /scolaire ou le bouton « Rejouer » du bilan, puis ouvre l'écran de partie.
// Le choix est relu et validé ici : le formulaire ne fait jamais foi.
export async function lancer(formData: FormData) {
  // « Rejouer » renvoie le choix d'origine sous forme compacte (champ `c`).
  const relance = formData.get("c");
  const champs = typeof relance === "string" ? new URLSearchParams(relance) : new URLSearchParams();
  if (typeof relance !== "string") for (const [cle, valeur] of formData) if (typeof valeur === "string") champs.append(cle, valeur);
  const choix = lireChoix(champs);
  const scolaire = choix?.mode === "scolaire" || champs.get("mode") === "scolaire";
  // Le mode inversé a son propre écran de choix, avec les mêmes filtres que le solo.
  const origine = champs.get("sens") === "inverse" ? (scolaire ? "/inverse?type=scolaire" : "/inverse") : scolaire ? "/scolaire" : "/solo";
  // Un test de chapitre repart du chapitre quand le pseudo manque ; les erreurs s'affichent sur /scolaire (la page du chapitre est statique).
  const chapitreTeste = choix?.test ? CHAPITRES.find((c) => c.id === choix.chapitres?.[0]) : undefined;
  const retourPseudo = chapitreTeste ? cheminChapitre(chapitreTeste) : origine;
  const erreur = (code: string) => `${origine}${origine.includes("?") ? "&" : "?"}erreur=${code}`;
  if (!choix) redirect(erreur("choix"));

  let destination: string;
  try {
    const game = await startGame(filtresDepuis(choix));
    const resolu = game.mystery ? choixGagnant(choix, game.mystery.winner) : choix;
    destination = `/partie/${game.game_id}?n=${game.question_count}&c=${encodeURIComponent(ecrireChoix(resolu))}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    destination = message.includes("pseudo")
      ? `/profil?next=${encodeURIComponent(retourPseudo)}`
      : erreur(message.includes("Pas assez") ? "peu" : "1");
  }
  // redirect() lève une exception : il reste hors du try.
  redirect(destination);
}
