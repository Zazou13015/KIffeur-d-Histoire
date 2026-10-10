import Link from "next/link";
import { lancer } from "@/app/partie/actions";
import SaveGame from "@/app/partie/[id]/SaveGame";
import type { SoloResult } from "@/lib/game/solo";
import { cheminChapitre } from "@/lib/apprendre/catalogue";
import { CHAPITRES, lireChoix } from "@/lib/solo/choix";
import { EnregistrerTest } from "@/components/pedagogie/EnregistrerTest";
import { BilanInteractif } from "./bilan/BilanInteractif";

type Props = {
  resultat: SoloResult;
  connecte: boolean;
  /** Partie encore anonyme, à rattacher au compte connecté. */
  anonyme: boolean;
  /** Choix d'origine, conservé tel quel pour rejouer. */
  relance?: string;
};

export function Bilan({ resultat, connecte, anonyme, relance }: Props) {
  const { game_id: id, questions, average_accuracy: precision } = resultat;
  const suite = `/partie/${id}`;
  const choix = relance ?? `mode=general&difficulte=${questions[0]?.unit ?? "YEAR"}`;
  const origine = relance ? lireChoix(new URLSearchParams(relance)) : null;
  const chapitreTeste = origine?.test ? CHAPITRES.find((c) => c.id === origine.chapitres?.[0]) : undefined;
  const unite = questions[0]?.unit === "DAY" ? "JOUR" : questions[0]?.unit === "MONTH" ? "MOIS" : "ANNÉE";
  const contexte = chapitreTeste ? `Test du chapitre · ${chapitreTeste.titre}`
    : `${resultat.direction === "inverse" ? "SOLO INVERSÉ" : "SOLO LIBRE"} · PRÉCISION ${unite}`;

  // Ce slot reste monté au même endroit pendant toute la navigation du carnet.
  // La sauvegarde et la progression gardent leurs effets et actions d'origine.
  const actions = <div className="hero-actions">
    <form action={lancer}><input type="hidden" name="c" value={choix} /><button type="submit" className="replay">Rejouer <span aria-hidden="true">↗</span></button></form>
    <Link className="change-mode" href="/">Changer de mode</Link>
    {chapitreTeste && <Link className="chapter-action" href={cheminChapitre(chapitreTeste)}>Revoir le chapitre</Link>}
    <div className="save">
      {!connecte ? <p>Tu as joué sans compte : cette partie ne sera pas sauvegardée. <Link href={`/connexion?next=${encodeURIComponent(suite)}`} className="font-bold underline underline-offset-4">Se connecter pour la sauvegarder</Link></p>
        : anonyme ? <SaveGame gameId={id} /> : <p role="status">✓ Partie sauvegardée dans ton compte KFFR.</p>}
    </div>
    {chapitreTeste && origine && <div className="chapter-status"><EnregistrerTest chapitre={chapitreTeste.id} partie={id} precision={precision}
      difficulte={origine.difficulte} connecte={connecte} anonyme={anonyme} /></div>}
  </div>;
  return <BilanInteractif resultat={resultat} contexte={contexte} actions={actions} />;
}
