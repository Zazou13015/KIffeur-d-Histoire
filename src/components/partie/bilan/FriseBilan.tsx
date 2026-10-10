"use client";

import { useEffect, useRef, useState } from "react";
import { cadrerBilan, groupesBilan, raisonSansEcart, type ReponseBilan } from "@/lib/game/bilan";
import { choisirPas, dateCourte, depuisT, graduations, texteAnnee, versT } from "@/lib/game/frise";

export function FriseBilan({ reponses, selection, choisir, inverse }: {
  reponses: ReponseBilan[]; selection: number; choisir: (i: number) => void; inverse: boolean;
}) {
  const [vue, setVue] = useState<"parcours" | "ecart">("parcours");
  const [largeur, setLargeur] = useState(1024);
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scene.current) return;
    const observer = new ResizeObserver(([entry]) => setLargeur(Math.max(1, entry.contentRect.width)));
    observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  const q = reponses[selection];
  const raison = q ? raisonSansEcart(q, inverse) : "Aucune réponse à représenter.";
  // Une sélection absente/expirée rend immédiatement la vue globale, sans effet de sauvegarde.
  const focus = vue === "ecart" && !raison && Boolean(q);
  const precision = focus ? q.precision : "annee";
  const cadre = cadrerBilan(focus ? [q] : reponses, precision, focus);
  const mobile = largeur < 700;
  const marge = mobile ? 32 : 55;
  const espace = Math.max(1, largeur - marge * 2);
  const x = (t: number) => marge + (t - cadre.debut) / (cadre.fin - cadre.debut) * espace;
  const h = mobile ? 164 : 125;
  const cy = focus ? (mobile ? 64 : 54) : (mobile ? 95 : 68);
  const py = focus ? (mobile ? 116 : 96) : cy + 27;
  const groupes = groupesBilan(reponses, cadre, espace, mobile ? 92 : 115);
  const meilleures = reponses.reduce((best, r, i) => r.points > (reponses[best]?.points ?? -1) ? i : best, 0);
  const ticks = graduations(cadre, choisirPas(cadre, espace, precision));
  // Les bornes de la vue globale sont les dates réellement présentes, comme dans A+.
  const bornes = [cadre.debut, cadre.fin].map((t) => ({ t, texte: dateCourte(depuisT(t, precision)), annee: undefined }));
  const graduationsVisibles = [...bornes.slice(0, 1), ...ticks.filter((g) => x(g.t) - marge > 100 && largeur - marge - x(g.t) > 85), ...bornes.slice(1)];
  const selectedX = q ? x(versT(q.attendue)) : 0;
  const playerX = q?.dateJoueur ? x(versT(q.dateJoueur)) : 0;
  const labelX = (value: number) => Math.max(8, Math.min(largeur - 8, value));
  const anchor = (value: number) => value < largeur * .35 ? "start" : value > largeur * .65 ? "end" : "middle";
  return <section className="journey" aria-label="Explorer la frise de votre partie">
    <div className="journey-header"><div><span className="eyebrow">{reponses.length} REPÈRES, UNE TRAVERSÉE</span><h2>Votre parcours dans l’Histoire.</h2></div>
      <div className="view-picker" role="group" aria-label="Vue de la frise">
        <button type="button" aria-pressed={!focus} onClick={() => setVue("parcours")}>Tout le parcours</button>
        <button type="button" aria-pressed={focus} disabled={Boolean(raison)} onClick={() => setVue("ecart")}>Voir l’écart</button>
      </div>
    </div>
    <div className="timeline-meta"><span>{raison ?? (focus ? (q.exacte ? "Une date exacte : deux repères alignés, sur deux lignes." : "Les deux dates sont cadrées pour voir votre écart.") : "Les dates proches sont regroupées. Choisissez un repère pour le revoir.")}</span>
      <span className="timeline-legend"><span>● Date attendue</span>{!inverse && <span>◇ Votre réponse</span>}</span>
    </div>
    <div className="timeline-scene" ref={scene}>
      <div className="timeline-svg"><svg viewBox={`0 0 ${largeur} ${h}`} role="img" aria-label={focus ? `Écart de la question ${q.position}` : "Dates attendues et réponses de la partie"}>
        <line className="axis" x1={8} x2={largeur - 8} y1={cy} y2={cy} />
        {!focus && graduationsVisibles.map((tick) => <g key={tick.t}><line className="axis" x1={x(tick.t)} x2={x(tick.t)} y1={py + 11} y2={py + 16} />
          <text x={labelX(x(tick.t))} y={h - 6} textAnchor={x(tick.t) < 70 ? "start" : x(tick.t) > largeur - 70 ? "end" : "middle"}>{tick.texte || (tick.annee !== undefined ? texteAnnee(tick.annee) : "")}</text></g>)}
        {(focus ? [q] : reponses).map((r) => {
          const cx = x(versT(r.attendue));
          const px = r.dateJoueur ? x(versT(r.dateJoueur)) : null;
          return <g key={r.id}>
            {px !== null && <><line className={`connector ${q?.id === r.id ? "active-connector" : ""}`} x1={cx} x2={px} y1={cy} y2={py} />
              <path className="player-mark" d={`M${px} ${py - 5}l5 5l-5 5l-5-5Z`} /></>}
            <circle className="correct-mark" cx={cx} cy={cy} r={q?.id === r.id ? 6 : 3.5} />
          </g>;
        })}
        {focus && <>
          <text className="selected-date" x={labelX(selectedX)} y={cy - 23} textAnchor={anchor(selectedX)}>{dateCourte(q.attendue)}</text>
          <text className="player-date" x={labelX(playerX)} y={py - 17} textAnchor={anchor(playerX)}>{dateCourte(q.dateJoueur!)}</text>
        </>}
      </svg></div>
      {!focus && <div className="timeline-hotspots">{groupes.map((g) => {
        const active = g.indices.includes(selection);
        const next = active ? g.indices[(g.indices.indexOf(selection) + 1) % g.indices.length] : g.indices[0];
        const pos = Math.max(50, Math.min(largeur - 50, x(g.t)));
        return <button key={g.indices.join("-")} type="button" style={{ left: `${pos / largeur * 100}%` }}
          aria-pressed={active} aria-controls="reponse-bilan" onClick={() => choisir(next)}
          aria-label={`Repère : ${g.indices.map((i) => `question ${reponses[i].position}`).join(", ")}${g.indices.length > 1 ? ". Cliquez à nouveau pour parcourir le groupe." : ""}`}>
          <strong>{g.indices.length === 1 ? String(reponses[g.indices[0]].position).padStart(2, "0") : `${g.indices.length} repères`}</strong>
          <small>{dateCourte(reponses[g.indices[0]].attendue)}{g.indices.length > 1 && ` — ${dateCourte(reponses[g.indices.at(-1)!].attendue)}`}</small>
        </button>;
      })}</div>}
    </div>
    <div className="journey-footer"><span className="folio">{focus ? "VUE RAPPROCHÉE" : "VUE D’ENSEMBLE"} · {dateCourte(depuisT(cadre.debut, precision))} — {dateCourte(depuisT(cadre.fin, precision))}</span>
      {reponses.length > 0 && <button type="button" className="best-answer" onClick={() => choisir(meilleures)}><span>VOTRE MEILLEURE RÉPONSE</span><strong>{reponses[meilleures].titre}</strong><b>{reponses[meilleures].points} pts ↗</b></button>}
    </div>
  </section>;
}
