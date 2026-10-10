import type { KeyboardEvent } from "react";
import { formatHistoricDate } from "@/lib/game/dates";
import type { ReponseBilan } from "@/lib/game/bilan";

export function CarnetBilan({ reponses, selection, choisir }: { reponses: ReponseBilan[]; selection: number; choisir: (index: number) => void }) {
  const q = reponses[selection];
  function naviguer(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const cible = e.key === "ArrowRight" ? Math.min(index + 1, reponses.length - 1)
      : e.key === "ArrowLeft" ? Math.max(index - 1, 0) : e.key === "Home" ? 0 : e.key === "End" ? reponses.length - 1 : null;
    if (cible === null) return;
    e.preventDefault(); choisir(cible);
    const boutons = e.currentTarget.parentElement?.querySelectorAll("button");
    boutons?.[cible]?.focus();
  }
  return <section className="review" aria-label="Détail et navigation des réponses">
    <div className="review-header">
      <div className="review-label"><span className="eyebrow">VOTRE CARNET DE RÉPONSES</span><span className="quiet">Choisissez une question</span></div>
      <nav className="question-tabs" aria-label="Choisir une réponse">
        {reponses.map((r, i) => <button key={r.id} type="button" aria-pressed={selection === i} aria-controls="reponse-bilan"
          aria-label={`Question ${r.position} : ${r.titre} · ${r.etat}`} data-exact={r.exacte} data-expired={r.expiree}
          onClick={() => choisir(i)} onKeyDown={(e) => naviguer(e, i)}>{String(r.position).padStart(2, "0")}</button>)}
      </nav>
    </div>
    {q ? <article id="reponse-bilan" className="answer-sheet" aria-live="polite">
      <div className="answer-heading"><span className="eyebrow">QUESTION {String(q.position).padStart(2, "0")}</span><h3>{q.titre}</h3>
        <p>{q.etat} · Précision : {q.accuracy.toLocaleString("fr-FR")} %{q.ecart && ` · Écart : ${q.ecart}`}</p>
      </div>
      <dl className="answer-date correct"><dt>Date attendue</dt><dd>{formatHistoricDate(q.attendue, q.precision)}</dd></dl>
      <dl className="answer-date"><dt>Votre réponse</dt><dd className={q.dateJoueur ? undefined : "answer-text"}>
        {q.dateJoueur ? formatHistoricDate(q.dateJoueur, q.precision) : q.texteJoueur ?? (q.expiree ? "Temps écoulé" : "Sans réponse")}
      </dd></dl>
      <div className="answer-points"><b>{q.points}</b><span>POINTS / 100</span></div>
    </article> : <p className="answer-sheet">Aucune réponse disponible pour cette partie.</p>}
    <div className="answer-navigation">
      <button type="button" className="plain-action" disabled={selection <= 0 || !q} onClick={() => choisir(selection - 1)}>← Question précédente</button>
      <span className="folio">{q ? `QUESTION ${String(q.position).padStart(2, "0")} SUR ${reponses.length}` : "AUCUNE QUESTION"}</span>
      <button type="button" className="plain-action" disabled={selection >= reponses.length - 1 || !q} onClick={() => choisir(selection + 1)}>Question suivante →</button>
    </div>
  </section>;
}
