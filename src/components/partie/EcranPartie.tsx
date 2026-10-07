"use client";

import { useState, useTransition } from "react";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";
import { REGLAGES, versT } from "@/lib/game/frise";
import { Motif } from "@/components/charte/Motif";
import { Frise } from "@/components/frise/Frise";
import { useVue } from "@/components/frise/useVue";
import { BandeEpoques } from "./BandeEpoques";
import { useSaisieFrise } from "@/components/saisie/useSaisieFrise";
import { SaisieDate } from "./SaisieDate";
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

const BRAVO: Record<Precision, string> = { annee: "Pile la bonne année !", mois: "Pile le bon mois !", jour: "Pile le bon jour !" };

export function EcranPartie({ question, corriger }: Props) {
  const { precision } = question;
  const controle = useVue(precision);
  const { vue, animer } = controle;
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [envoi, demarrer] = useTransition();
  const { champs, reponse, complete, setEnSaisie, enSaisie, changerChamps, poserSurFrise, reinitialiser } = useSaisieFrise(precision, controle);

  function valider() {
    if (correction) {
      // Démonstration : on rejoue la même question.
      setCorrection(null);
      reinitialiser();
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
