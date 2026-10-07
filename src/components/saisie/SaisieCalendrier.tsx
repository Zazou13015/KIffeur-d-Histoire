"use client";

import { useEffect, useRef, useState } from "react";
import { annees, decennies, libelleSiecle, libelleTranche, siecles, type Ere, type Siecle, type Tranche } from "@/lib/game/calendrier";
import { formatHistoricDate, MOIS, type HistoricDate, type Precision } from "@/lib/game/dates";
import { joursDansMois } from "@/lib/game/frise";

type Props = {
  precision: Precision;
  onAnswer: (date: HistoricDate) => void;
  disabled?: boolean;
};

type Choix = {
  siecle: Siecle | null;
  decennie: Tranche | null;
  annee: number | null;
  mois: number | null;
  jour: number | null;
};

const VIDE: Choix = { siecle: null, decennie: null, annee: null, mois: null, jour: null };

type Etape = "siecle" | "decennie" | "annee" | "mois" | "jour";

const ETAPES: Record<Precision, Etape[]> = {
  annee: ["siecle", "decennie", "annee"],
  mois: ["siecle", "decennie", "annee", "mois"],
  jour: ["siecle", "decennie", "annee", "mois", "jour"],
};

const TITRES: Record<Etape, string> = {
  siecle: "Quel siècle ?",
  decennie: "Quelle décennie ?",
  annee: "Quelle année ?",
  mois: "Quel mois ?",
  jour: "Quel jour ?",
};

const nomMois = (m: number) => MOIS[m - 1][0].toUpperCase() + MOIS[m - 1].slice(1);

const TUILE =
  "cible grid content-center justify-items-start gap-0.5 border border-filet bg-blanc-cartel px-2.5 py-2 text-left text-encre transition-colors hover:border-encre hover:bg-papier";

// Calendrier par étapes : siècle, décennie, année, puis mois et jour selon la difficulté.
// Le dernier choix envoie la réponse ; un clic sur une étape déjà choisie permet de la corriger.
export function SaisieCalendrier({ precision, onAnswer, disabled = false }: Props) {
  const [ere, setEre] = useState<Ere>("ap");
  const [choix, setChoix] = useState<Choix>(VIDE);
  const grille = useRef<HTMLDivElement>(null);
  const dejaMonte = useRef(false);

  const etapes = ETAPES[precision];
  const faites = etapes.filter((e) => choix[e] != null).length;
  const termine = faites === etapes.length;
  const etape = termine ? null : etapes[faites];

  // Au clavier, on retombe sur la première case de l'étape suivante (sauf à l'ouverture de la page).
  useEffect(() => {
    if (!dejaMonte.current) {
      dejaMonte.current = true;
      return;
    }
    grille.current?.querySelector<HTMLElement>("button")?.focus();
  }, [faites]);

  function choisir(partiel: Partial<Choix>) {
    const suivant = { ...choix, ...partiel };
    setChoix(suivant);
    const complet = etapes.every((e) => suivant[e] != null);
    if (complet) {
      const date: HistoricDate = { year: suivant.annee! };
      if (precision !== "annee") date.month = suivant.mois;
      if (precision === "jour") date.day = suivant.jour;
      onAnswer(date);
    }
  }

  // Revenir à une étape efface celle-ci et les suivantes.
  function revenirA(e: Etape) {
    const i = etapes.indexOf(e);
    const efface = Object.fromEntries(etapes.slice(i).map((x) => [x, null]));
    setChoix({ ...choix, ...efface });
  }

  const resume: { etape: Etape; texte: string }[] = [];
  if (choix.siecle) resume.push({ etape: "siecle", texte: libelleSiecle(choix.siecle) });
  if (choix.decennie) resume.push({ etape: "decennie", texte: libelleTranche(choix.decennie) });
  if (choix.annee != null) resume.push({ etape: "annee", texte: choix.annee < 0 ? `${-choix.annee} av. J.-C.` : `${choix.annee}` });
  if (choix.mois != null) resume.push({ etape: "mois", texte: nomMois(choix.mois) });
  if (choix.jour != null) resume.push({ etape: "jour", texte: `${choix.jour}` });

  const reponse: HistoricDate | null = termine
    ? { year: choix.annee!, ...(precision !== "annee" && { month: choix.mois }), ...(precision === "jour" && { day: choix.jour }) }
    : null;

  return (
    <div className="grid gap-3 border border-filet bg-papier p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-encre-douce">Choisissez la date, étape par étape</span>
        <div role="group" aria-label="Avant ou après Jésus-Christ" className="flex">
          {(["ap", "av"] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={ere === e}
              disabled={disabled}
              onClick={() => {
                setEre(e);
                setChoix(VIDE);
              }}
              className="cible border border-encre px-3 text-[13px] font-bold not-first:border-l-0 aria-pressed:bg-encre aria-pressed:text-papier"
            >
              {e === "ap" ? "apr. J.-C." : "av. J.-C."}
            </button>
          ))}
        </div>
      </div>

      {resume.length > 0 && (
        <nav aria-label="Vos choix" className="flex flex-wrap gap-1.5">
          {resume.map(({ etape: e, texte }) => (
            <button
              key={e}
              type="button"
              disabled={disabled}
              onClick={() => revenirA(e)}
              aria-label={`${texte} : modifier`}
              className="cible inline-flex items-center gap-1.5 border border-laiton bg-fond-resultat px-2.5 text-sm text-encre hover:border-encre"
            >
              <span className="date text-lg">{texte}</span>
              <span aria-hidden="true" className="text-xs text-encre-douce">
                ✎
              </span>
            </button>
          ))}
        </nav>
      )}

      {etape && (
        <div role="group" aria-label={TITRES[etape]} className="grid gap-2">
          <h3 className="m-0 text-lg">{TITRES[etape]}</h3>
          <div ref={grille} className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
            {etape === "siecle" &&
              siecles(ere).map((s) => (
                <button key={s.numero} type="button" disabled={disabled} className={TUILE} onClick={() => choisir({ siecle: s })}>
                  <b>{libelleSiecle(s)}</b>
                  <span className="date text-sm text-encre-douce">{libelleTranche(s)}</span>
                </button>
              ))}
            {etape === "decennie" &&
              decennies(choix.siecle!).map((d) => (
                <button key={d.debut} type="button" disabled={disabled} className={TUILE} onClick={() => choisir({ decennie: d })}>
                  <span className="date text-lg">{libelleTranche(d)}</span>
                </button>
              ))}
            {etape === "annee" &&
              annees(choix.decennie!).map((a) => (
                <button key={a} type="button" disabled={disabled} className={TUILE} onClick={() => choisir({ annee: a })}>
                  <span className="date text-2xl">{a < 0 ? `${-a}` : a}</span>
                </button>
              ))}
            {etape === "mois" &&
              MOIS.map((_, i) => (
                <button key={i} type="button" disabled={disabled} className={TUILE} onClick={() => choisir({ mois: i + 1 })}>
                  {nomMois(i + 1)}
                </button>
              ))}
            {etape === "jour" &&
              Array.from({ length: joursDansMois(choix.annee!, choix.mois!) }, (_, i) => i + 1).map((j) => (
                <button key={j} type="button" disabled={disabled} className={TUILE} onClick={() => choisir({ jour: j })}>
                  <span className="date text-xl">{j}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <p role="status" className="m-0 min-h-6 text-[15px] text-encre-douce">
        {reponse && (
          <>
            Votre réponse : <b className="date text-xl text-encre">{formatHistoricDate(reponse, precision)}</b>
          </>
        )}
      </p>
    </div>
  );
}
