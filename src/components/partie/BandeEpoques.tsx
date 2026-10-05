"use client";

import { useSyncExternalStore } from "react";
import { clamp, DEBUT_FRISE, EPOQUES, FIN_FRISE, texteAnnee, type Vue } from "@/lib/game/frise";
import s from "./partie.module.css";

// Largeurs différenciées mais tassées : pas à l'échelle, sinon la Préhistoire disparaît.
// Sur téléphone, cinq parts égales.
function disposition(etroit: boolean) {
  const poids = EPOQUES.map((e) => (etroit ? 1 : 28 + Math.sqrt(e.fin - e.debut)));
  const total = poids.reduce((a, b) => a + b, 0);
  const cumul = poids.map((_, i) => poids.slice(0, i).reduce((a, b) => a + b, 0) / total);
  // Position (en %) d'une date sur la bande, pour la fenêtre qui montre la partie visible.
  const position = (t: number) => {
    let i = EPOQUES.findIndex((e) => t < e.fin);
    if (i === -1) i = EPOQUES.length - 1;
    const e = EPOQUES[i];
    return (cumul[i] + (clamp((t - e.debut) / (e.fin - e.debut), 0, 1) * poids[i]) / total) * 100;
  };
  return { poids, position };
}

const ETROIT = "(max-width: 600px)";
function useEtroit() {
  return useSyncExternalStore(
    (rappel) => {
      const mq = matchMedia(ETROIT);
      mq.addEventListener("change", rappel);
      return () => mq.removeEventListener("change", rappel);
    },
    () => matchMedia(ETROIT).matches,
    () => false,
  );
}

export function BandeEpoques({ vue, animer }: { vue: Vue; animer: (debut: number, fin: number) => void }) {
  const { poids, position } = disposition(useEtroit());
  const c = (vue.debut + vue.fin) / 2;
  const tout = vue.fin - vue.debut > (FIN_FRISE - DEBUT_FRISE) * 0.9;
  const l = position(vue.debut);
  const r = position(vue.fin);

  return (
    <div className={s.epoques}>
      <div
        className={s.piste}
        role="group"
        aria-label="Aller à une époque"
        style={{ "--colonnes": poids.map((p) => `minmax(0, ${p.toFixed(2)}fr)`).join(" ") } as React.CSSProperties}
      >
        {EPOQUES.map((e) => {
          const active = !tout && c >= e.debut && c < e.fin;
          return (
            <button
              key={e.nom}
              type="button"
              className={active ? s.active : undefined}
              aria-pressed={active}
              aria-label={`Zoomer sur : ${e.nom}`}
              style={{ background: e.couleur }}
              onClick={() => {
                const marge = (e.fin - e.debut) * 0.04;
                animer(e.debut - marge, e.fin + marge);
              }}
            >
              <b>
                <span className={s.long}>{e.nom === "Époque contemporaine" ? "Contemporaine" : e.nom}</span>
                <span className={s.court}>{e.court}</span>
              </b>
              <small className="date">{e.debut <= DEBUT_FRISE ? "les origines" : `dès ${texteAnnee(e.debut)}`}</small>
            </button>
          );
        })}
        <div className={s.fenetre} style={{ left: `${l}%`, width: `${Math.max(0.4, r - l)}%` }} />
      </div>
      <button type="button" className={tout ? `${s.tout} ${s.active}` : s.tout} onClick={() => animer(DEBUT_FRISE, FIN_FRISE)}>
        Toute l&apos;histoire
      </button>
    </div>
  );
}
