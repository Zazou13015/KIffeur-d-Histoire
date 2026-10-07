"use client";

import { useEffect, useRef, useState } from "react";
import { formatHistoricDate, type HistoricDate, type Precision } from "@/lib/game/dates";
import { REGLAGES, versT } from "@/lib/game/frise";
import type { Chrono } from "@/lib/game/partie";
import { Motif } from "@/components/charte/Motif";
import { Frise } from "@/components/frise/Frise";
import { useVue } from "@/components/frise/useVue";
import { BandeEpoques } from "./BandeEpoques";
import { useSaisieFrise } from "@/components/saisie/useSaisieFrise";
import { ChronoCirculaire } from "@/components/ui/ChronoCirculaire";
import { SaisieDate } from "./SaisieDate";
import s from "./partie.module.css";

// Ce que le navigateur sait d'une question : jamais la date attendue, ni la description avant la réponse.
export type QuestionPublique = {
  id: string;
  titre: string;
  description?: string;
  inventaire?: string;
  /** Motif de la charte (public/motifs.svg) : aperçu et démonstrations. */
  illustration?: string;
  /** Illustration de l'événement, servie par Supabase Storage. */
  illustrationUrl?: string;
  precision: Precision;
  numero: number;
  total: number;
};

// Renvoyé par le serveur une fois la réponse envoyée.
export type Correction = {
  bonne: HistoricDate;
  points: number;
  ecart: string | null;
  description?: string | null;
  /** Le temps était écoulé : la question vaut 0. */
  expiree?: boolean;
};

type Props = {
  question: QuestionPublique;
  /** `null` : le temps est écoulé, on demande la correction sans réponse. */
  corriger: (questionId: string, reponse: HistoricDate | null) => Promise<Correction>;
  /** Chrono affiché (le serveur fait foi). Sans lui, pas de chrono. */
  chrono?: Chrono;
  /** Bouton après la correction. Sans lui (aperçu), la question se rejoue. */
  suivante?: { libelle: string; action: () => Promise<void> };
};

const BRAVO: Record<Precision, string> = { annee: "Pile la bonne année !", mois: "Pile le bon mois !", jour: "Pile le bon jour !" };

export function EcranPartie({ question, corriger, chrono, suivante }: Props) {
  const { precision } = question;
  const controle = useVue(precision);
  const { vue, animer } = controle;
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [passage, setPassage] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [restant, setRestant] = useState(chrono ? chrono.totalMs / 1000 : 0);
  const { champs, reponse, complete, setEnSaisie, enSaisie, changerChamps, poserSurFrise, reinitialiser } = useSaisieFrise(precision, controle);
  const enCours = useRef(false);
  const expireTente = useRef(false);

  async function envoyer(rep: HistoricDate | null) {
    if (enCours.current) return;
    enCours.current = true;
    setEnvoi(true);
    setErreur(null);
    try {
      const c = await corriger(question.id, rep);
      setCorrection(c);
      // La frise montre la bonne date, et la réponse quand il y en a une.
      const b = versT(c.bonne);
      const a = rep ? versT(rep) : b;
      const marge = Math.max(REGLAGES[precision].marge, Math.abs(a - b) * 1.2);
      animer(Math.min(a, b) - marge, Math.max(a, b) + marge);
    } catch {
      setErreur("La connexion a été perdue : ta réponse n'est pas partie. Réessaie.");
    } finally {
      enCours.current = false;
      setEnvoi(false);
    }
  }

  // Le chrono n'est qu'un affichage : à zéro on demande la correction, le serveur constate l'expiration.
  const envoyerRef = useRef(envoyer);
  useEffect(() => {
    envoyerRef.current = envoyer;
  });
  useEffect(() => {
    if (!chrono || correction) return;
    const tic = () => {
      const r = Math.max(0, (chrono.finMs - Date.now()) / 1000);
      setRestant(r);
      if (r <= 0 && !expireTente.current) {
        expireTente.current = true;
        void envoyerRef.current(null);
      }
    };
    tic();
    const id = setInterval(tic, 250);
    return () => clearInterval(id);
  }, [chrono, correction]);

  async function valider() {
    if (passage || envoi) return;
    if (correction) {
      if (!suivante) {
        // Aperçu : on rejoue la même question.
        setCorrection(null);
        reinitialiser();
        return;
      }
      setPassage(true);
      setErreur(null);
      try {
        await suivante.action();
      } catch {
        setErreur("Impossible de continuer : la connexion a été perdue. Réessaie.");
        setPassage(false);
      }
      return;
    }
    if (!complete || !reponse) return;
    await envoyer(reponse);
  }

  // Temps écoulé sans que la correction ait pu arriver (réseau coupé) : un bouton pour redemander.
  const expirePerdue = erreur != null && restant <= 0 && !correction;
  const description = correction?.description ?? question.description;

  return (
    <section className={s.jeu} aria-label="Écran de partie">
      <aside className={s.carte}>
        {(question.inventaire || chrono) && (
          <div className={s.entete}>
            <span className={s.inventaire}>{question.inventaire}</span>
            {chrono && !correction && <ChronoCirculaire restant={restant} total={chrono.totalMs / 1000} taille={64} />}
          </div>
        )}
        {(question.illustrationUrl || question.illustration) && (
          <div className={s.illustration}>
            {question.illustrationUrl ? (
              // Dessin SVG léger (8 Ko) : pas d'optimisation d'image nécessaire.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.illustrationUrl} alt="" width={160} height={120} />
            ) : (
              <Motif nom={question.illustration!} viewBox="0 0 160 120" />
            )}
          </div>
        )}
        <h2>{question.titre}</h2>
        {description && <p>{description}</p>}
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
          verrouille={correction != null || envoi}
        />
        {erreur && (
          <p role="alert" className={s.erreur}>
            {erreur}
          </p>
        )}
        {expirePerdue ? (
          <button type="button" className={s.valider} onClick={() => void envoyer(null)}>
            Réessayer
          </button>
        ) : (
          <button type="button" className={s.valider} onClick={valider} disabled={envoi || passage || (!correction && !complete)}>
            {correction ? (suivante?.libelle ?? "Rejouer cette question") : "Valider ma réponse"}
          </button>
        )}
        {correction && (
          <div className={s.resultat} role="status">
            <span className={s.inventaire}>Réponse : {formatHistoricDate(correction.bonne, precision)}</span>
            <span className={`${s.points} date`}>{correction.points} pts</span>
            <span>
              {correction.expiree
                ? "Temps écoulé : cette question vaut 0 point."
                : correction.ecart
                  ? `Écart de ${correction.ecart}.`
                  : BRAVO[precision]}
            </span>
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
