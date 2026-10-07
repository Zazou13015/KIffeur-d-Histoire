"use client";

import { useRef, useState, useTransition } from "react";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";
import { clamp, DEBUT_FRISE, FIN_FRISE, joursDansMois, REGLAGES, versT } from "@/lib/game/frise";
import { Motif } from "@/components/charte/Motif";
import { Frise } from "@/components/frise/Frise";
import { useVue } from "@/components/frise/useVue";
import { BandeEpoques } from "./BandeEpoques";
import { CHAMPS_VIDES, ordreChamps, SaisieDate, type Champs } from "./SaisieDate";
import s from "./partie.module.css";

// Ce que le navigateur sait d'une question : jamais la date attendue.
export type QuestionPublique = {
  id: string;
  titre: string;
  description: string;
  inventaire: string;
  illustration?: string;
  precision: Precision;
  numero: number;
  total: number;
};

// Renvoyé par le serveur une fois la réponse envoyée.
export type Correction = { bonne: HistoricDate; points: number; ecart: string | null };

type Props = {
  question: QuestionPublique;
  corriger: (questionId: string, reponse: HistoricDate) => Promise<Correction>;
};

const champsDepuis = (d: HistoricDate): Champs => ({
  jour: d.day != null ? String(d.day).padStart(2, "0") : "",
  mois: d.month != null ? String(d.month).padStart(2, "0") : "",
  annee: (d.year < 0 ? "-" : "") + Math.abs(d.year),
});

// Date lue dans les cases ; null tant que l'année manque.
function reponseDepuis(c: Champs, p: Precision): HistoricDate | null {
  const a = parseInt(c.annee.replace(/\D/g, ""), 10);
  if (!a) return null;
  const year = clamp((c.annee.startsWith("-") ? -1 : 1) * a, DEBUT_FRISE, FIN_FRISE - 1);
  const d: HistoricDate = { year };
  const m = parseInt(c.mois, 10);
  const j = parseInt(c.jour, 10);
  if (p !== "annee" && m >= 1) d.month = clamp(m, 1, 12);
  if (p === "jour" && d.month && j >= 1) d.day = clamp(j, 1, joursDansMois(year, d.month));
  return d;
}

const BRAVO: Record<Precision, string> = { annee: "Pile la bonne année !", mois: "Pile le bon mois !", jour: "Pile le bon jour !" };

export function EcranPartie({ question, corriger }: Props) {
  const { precision } = question;
  const controle = useVue(precision);
  const { vue, vueRef, animer } = controle;
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const [reponse, setReponse] = useState<HistoricDate | null>(null);
  const [enSaisie, setEnSaisie] = useState(false);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [envoi, demarrer] = useTransition();
  const suivi = useRef<ReturnType<typeof setTimeout>>(undefined);

  const complete = reponse != null && ordreChamps(precision).every((c) => champs[c].replace(/\D/g, "") !== "");

  function changerChamps(c: Champs) {
    setChamps(c);
    clearTimeout(suivi.current);
    const vide = ordreChamps(precision).every((k) => !c[k].replace(/\D/g, "")) && !c.annee.startsWith("-");
    if (vide) {
      // Cases vidées : plus de losange, la frise revient sur toute l'histoire.
      setReponse(null);
      animer(DEBUT_FRISE, FIN_FRISE);
      return;
    }
    const d = reponseDepuis(c, precision);
    setReponse(d);
    if (!d) return;
    suivi.current = setTimeout(() => {
      // Plus la date est précise, plus la frise zoome : ~300 ans, puis ~4 ans, puis ~4 mois.
      const connus = 1 + (d.month ? 1 : 0) + (d.day ? 1 : 0);
      const paliers = REGLAGES[precision].suivi;
      const v = vueRef.current;
      const span = v.fin - v.debut;
      const cible = Math.min(span, paliers[Math.min(connus, paliers.length) - 1]);
      const t = versT(d);
      if (cible < span || t < v.debut + span * 0.1 || t > v.fin - span * 0.1) animer(t - cible / 2, t + cible / 2);
    }, 450);
  }

  function poserSurFrise(d: HistoricDate) {
    setReponse(d);
    setChamps(champsDepuis(d));
  }

  function valider() {
    if (correction) {
      // Démonstration : on rejoue la même question.
      setCorrection(null);
      setReponse(null);
      setChamps(CHAMPS_VIDES);
      animer(DEBUT_FRISE, FIN_FRISE);
      return;
    }
    if (!complete || !reponse) return;
    demarrer(async () => {
      const c = await corriger(question.id, reponse);
      setCorrection(c);
      const a = versT(reponse);
      const b = versT(c.bonne);
      const marge = Math.max(REGLAGES[precision].marge, Math.abs(a - b) * 1.2);
      animer(Math.min(a, b) - marge, Math.max(a, b) + marge);
    });
  }

  return (
    <section className={s.jeu} aria-label="Écran de partie">
      <aside className={s.carte}>
        {question.illustration && (
          <div className={s.illustration}>
            <Motif nom={question.illustration} viewBox="0 0 160 120" />
          </div>
        )}
        <span className={s.inventaire}>{question.inventaire}</span>
        <h2>{question.titre}</h2>
        <p>{question.description}</p>
        <div className={s.meta}>
          <span>
            Question {question.numero} sur {question.total} · <b>{REGLAGES[precision].consigne}</b>
          </span>
        </div>
        <SaisieDate
          precision={precision}
          champs={champs}
          onChange={changerChamps}
          onFocusChange={setEnSaisie}
          onValider={valider}
          verrouille={correction != null}
        />
        <button type="button" className={s.valider} onClick={valider} disabled={envoi || (!correction && !complete)}>
          {correction ? "Rejouer cette question" : "Valider ma réponse"}
        </button>
        {correction && (
          <div className={s.resultat} role="status">
            <span className={s.inventaire}>Réponse : {formatHistoricDate(correction.bonne, precision)}</span>
            <span className={`${s.points} date`}>{correction.points} pts</span>
            <span>{correction.ecart ? `Écart de ${correction.ecart}.` : BRAVO[precision]}</span>
          </div>
        )}
      </aside>

      <div className={s.plateau}>
        <Frise
          precision={precision}
          controle={controle}
          reponse={reponse}
          onReponse={poserSurFrise}
          enSaisie={enSaisie}
          correction={correction && { bonne: correction.bonne, titre: question.titre }}
        />
        <BandeEpoques vue={vue} animer={animer} />
      </div>
    </section>
  );
}
