import { appreciation, type ReponseBilan } from "@/lib/game/bilan";
import type { SoloResult } from "@/lib/game/solo";

export function ScoreBilan({ resultat, reponses, contexte }: { resultat: SoloResult; reponses: ReponseBilan[]; contexte: string }) {
  const maximum = resultat.question_count * 100;
  const exactes = reponses.filter((q) => q.exacte).length;
  return <>
    <div className="score-seal" data-large={resultat.total_points >= 10000} role="img" aria-label={`${resultat.total_points} points sur ${maximum}`}>
      <span className="score-overline" aria-hidden="true">VOTRE SCORE</span>
      <span className="score" aria-hidden="true">{resultat.total_points}</span>
      <span className="score-base" aria-hidden="true">SUR <b>{maximum.toLocaleString("fr-FR")}</b> POINTS</span>
      <span className="score-ornament" aria-hidden="true">✦</span>
    </div>
    <div className="hero-story">
      <span className="eyebrow">{contexte}</span>
      <h1>{appreciation(resultat.total_points, maximum)}</h1>
      <p className="intro">{resultat.question_count} questions. Une nouvelle page de votre Histoire.</p>
      <div className="performance">
        <div className="accuracy" role="img" aria-label={`Précision moyenne : ${resultat.average_accuracy} %`}><strong aria-hidden="true">{resultat.average_accuracy.toLocaleString("fr-FR")}<span>%</span></strong><span aria-hidden="true">de précision<br />moyenne</span></div>
        <span className="performance-rule" aria-hidden="true" />
        <div className="exact"><strong>{exactes}</strong><span>{resultat.direction === "inverse" ? "réponses exactes" : "dates exactes"}<br />sur {resultat.question_count} questions</span></div>
      </div>
    </div>
  </>;
}
