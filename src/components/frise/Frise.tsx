"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoricDate, Precision } from "@/lib/game/dates";
import {
  choisirPas,
  clamp,
  contexte,
  dateCourte,
  decaler,
  decor,
  depuisT,
  DEBUT_FRISE,
  EPOQUES,
  FIN_FRISE,
  graduations,
  legendePas,
  texteAnnee,
  versT,
  type Vue,
} from "@/lib/game/frise";
import { regrouper, type MarqueurFrise } from "@/lib/game/marqueurs";
import { Motif } from "@/components/charte/Motif";
import { useVue } from "./useVue";
import s from "./frise.module.css";

type Props = {
  precision: Precision;
  /**
   * « selection » : un clic ou un tap pose une réponse (onReponse).
   * « lecture » : la frise se parcourt mais ne répond pas (mode pédagogique).
   */
  mode?: "selection" | "lecture";
  /** Plage visible au départ (toute l'histoire par défaut). */
  plageInitiale?: { debut: HistoricDate; fin: HistoricDate };
  /**
   * Pilotage de la vue depuis l'extérieur (écran de partie : bande des époques, saisie au clavier).
   * Sans lui, la frise gère elle-même son zoom.
   */
  controle?: ReturnType<typeof useVue>;
  reponse?: HistoricDate | null;
  onReponse?: (d: HistoricDate) => void;
  enSaisie?: boolean;
  // Renseignée seulement après la correction (la bonne date ne vient jamais avant).
  correction?: { bonne: HistoricDate; titre: string } | null;
  /** Cartes d'événements posées sur la frise ; les marqueurs proches se regroupent. */
  marqueurs?: MarqueurFrise[];
  onMarqueur?: (id: string) => void;
};

// Place minimale entre deux marqueurs avant qu'ils se regroupent, et couloirs où ils se posent.
const ECART_MARQUEURS = 112;
const COULOIRS_MARQUEURS = [10, 62, 114];

// Largeur de texte pour garder l'étiquette de la bonne réponse dans le cadre.
function largeurTexte(texte: string): number {
  return texte.length * 7 + 22;
}

export function Frise({
  precision,
  mode = "selection",
  plageInitiale,
  controle,
  reponse = null,
  onReponse,
  enSaisie = false,
  correction = null,
  marqueurs,
  onMarqueur,
}: Props) {
  const interne = useVue(precision);
  const { vue, vueRef, placer, animer, zoomer, arreter } = controle ?? interne;
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(800);
  const [fantome, setFantome] = useState<{ x: number; date: HistoricDate } | null>(null);
  const glisse = useRef<{ x: number; vue: Vue; bouge: boolean; losange: boolean } | null>(null);
  const pointeurs = useRef(new Map<number, number>());
  const pincement = useRef<{ ecart: number; vue: Vue; milieu: number } | null>(null);
  const corrige = correction != null;
  const selection = mode === "selection" && !corrige && onReponse != null;
  const aDesMarqueurs = marqueurs != null && marqueurs.length > 0;

  // Plage de départ : appliquée une fois, sauf si l'écran pilote lui-même la vue.
  useEffect(() => {
    if (controle || !plageInitiale) return;
    placer(versT(plageInitiale.debut), versT(plageInitiale.fin));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- au montage seulement
  }, []);

  const parId = useMemo(() => new Map((marqueurs ?? []).map((m) => [m.id, m])), [marqueurs]);
  const tries = useMemo(
    () => (marqueurs ?? []).map((m) => ({ id: m.id, t: versT(m.date) })).sort((a, b) => a.t - b.t),
    [marqueurs],
  );

  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setLargeur(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tA = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const v = vueRef.current;
    return v.debut + ((clientX - r.left) / r.width) * (v.fin - v.debut);
  };
  const dateA = (clientX: number) => depuisT(clamp(tA(clientX), DEBUT_FRISE, FIN_FRISE - 0.001), precision);

  // Molette : écouteur non passif pour pouvoir bloquer le défilement de la page.
  useEffect(() => {
    const el = ref.current!;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      arreter();
      const r = el.getBoundingClientRect();
      const v = vueRef.current;
      const a = v.debut + ((e.clientX - r.left) / r.width) * (v.fin - v.debut);
      const f = Math.exp(e.deltaY * 0.0016);
      placer(a - (a - v.debut) * f, a + (v.fin - a) * f);
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  }, [arreter, placer, vueRef]);

  function surAppui(e: React.PointerEvent<HTMLDivElement>) {
    // Un marqueur est un bouton : on laisse le clic lui revenir.
    if ((e.target as HTMLElement).closest("[data-marqueur]")) return;
    arreter();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointeurs.current.set(e.pointerId, e.clientX);
    if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      pincement.current = { ecart: Math.abs(a - b), vue: vueRef.current, milieu: tA((a + b) / 2) };
      return;
    }
    const surLosange = (e.target as HTMLElement).dataset.losange === "oui";
    glisse.current = { x: e.clientX, vue: vueRef.current, bouge: false, losange: surLosange && selection };
  }

  function surDeplacement(e: React.PointerEvent<HTMLDivElement>) {
    if (selection && e.pointerType === "mouse") {
      const r = ref.current!.getBoundingClientRect();
      setFantome({ x: e.clientX - r.left, date: dateA(e.clientX) });
    }
    if (!pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.set(e.pointerId, e.clientX);
    const p = pincement.current;
    if (p && pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      const f = p.ecart / Math.max(20, Math.abs(a - b));
      placer(p.milieu - (p.milieu - p.vue.debut) * f, p.milieu + (p.vue.fin - p.milieu) * f);
      return;
    }
    const g = glisse.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 4) {
      g.bouge = true;
      setFantome(null);
    }
    if (g.losange) return onReponse?.(dateA(e.clientX));
    const parPixel = (g.vue.fin - g.vue.debut) / ref.current!.clientWidth;
    placer(g.vue.debut - dx * parPixel, g.vue.fin - dx * parPixel);
  }

  function surRelache(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointeurs.current.has(e.pointerId)) return;
    pointeurs.current.delete(e.pointerId);
    const g = glisse.current;
    // Un clic sans glisser pose la réponse.
    if (g && !pincement.current && !g.bouge && selection && e.type === "pointerup") onReponse?.(dateA(e.clientX));
    if (pointeurs.current.size === 0) {
      glisse.current = null;
      pincement.current = null;
    }
  }

  // Flèches : un pas de la précision demandée, Maj = 10 pas.
  function surTouche(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!selection || !reponse) return;
    const sens = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!sens) return;
    e.preventDefault();
    onReponse?.(decaler(reponse, sens * (e.shiftKey ? 10 : 1), precision));
  }

  const span = vue.fin - vue.debut;
  const X = (t: number) => ((t - vue.debut) / span) * largeur;
  const pas = choisirPas(vue, largeur, precision);
  const rappel = contexte(vue, pas);
  const xReponse = reponse ? X(versT(reponse)) : 0;
  const bonne = correction?.bonne;
  const xBonne = bonne ? X(versT(bonne)) : 0;
  const largeurPuce = correction ? largeurTexte(correction.titre) : 0;
  const groupes = aDesMarqueurs ? regrouper(tries, vue, largeur, ECART_MARQUEURS, precision) : [];

  // Un groupe s'ouvre en zoomant dessus ; une carte seule prévient l'écran qui l'affiche.
  function ouvrirGroupe(debut: number, fin: number) {
    const marge = Math.max((fin - debut) * 0.5, (vue.fin - vue.debut) * 0.08);
    animer(debut - marge, fin + marge);
  }

  return (
    <>
      <div className={s.outils}>
        <span className={s.echelle}>{legendePas(pas)}</span>
        <button type="button" onClick={() => zoomer(2)} aria-label="Dézoomer">−</button>
        <button type="button" onClick={() => zoomer(0.5)} aria-label="Zoomer">+</button>
      </div>
      <div
        ref={ref}
        className={selection ? s.frise : `${s.frise} ${s.lecture}`}
        aria-label={
          selection
            ? "Frise chronologique : molette pour zoomer, glisser pour se déplacer, cliquer pour placer sa réponse"
            : "Frise chronologique : molette pour zoomer, glisser pour se déplacer"
        }
        onPointerDown={surAppui}
        onPointerMove={surDeplacement}
        onPointerUp={surRelache}
        onPointerCancel={surRelache}
        onPointerLeave={() => setFantome(null)}
        onKeyDown={surTouche}
      >
        {EPOQUES.map((ep) => {
          const l = X(ep.debut);
          const r = X(ep.fin);
          if (r < 0 || l > largeur) return null;
          return (
            <div key={ep.nom} className={s.bandeau} style={{ left: l, width: r - l, background: ep.couleur }}>
              {r - Math.max(l, 0) > 90 && <span style={{ left: Math.max(0, -l) + 8 }}>{ep.nom}</span>}
            </div>
          );
        })}

        {graduations(vue, pas).map((g) => {
          const x = X(g.t);
          return (
            <div key={g.t}>
              <div className={s.grille} style={{ left: x }} />
              <div className={g.majeure ? `${s.trait} ${s.majeur}` : s.trait} style={{ left: x }} />
              {x > 18 && x < largeur - 18 && (g.texte || g.annee != null) && (
                <div className={`${s.etiquette} date`} style={{ left: x }}>
                  {g.majeure ? (
                    <b>
                      {g.texte}
                      {g.texte && g.annee != null && " "}
                      {g.annee != null && <Annee annee={g.annee} />}
                    </b>
                  ) : (
                    g.texte || <Annee annee={g.annee!} />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className={s.axe} />
        {rappel && <div className={`${s.rappel} date`}>{rappel}</div>}

        {!aDesMarqueurs && decor(vue, largeur).map((m) => (
          <div
            key={m.cle}
            className={m.discret ? `${s.motif} ${s.discret}` : s.motif}
            style={{ left: m.x, top: m.haut, width: m.taille, height: m.taille, transform: `translateX(-50%) rotate(${m.angle}deg)` }}
          >
            <Motif nom={m.motif} />
          </div>
        ))}

        {groupes.map((g, i) => {
          const x = X(g.t);
          if (g.ids.length > 1) {
            const titres = g.ids.map((id) => parId.get(id)!.titre).join(", ");
            return (
              <button
                key={g.ids.join("|")}
                type="button"
                data-marqueur
                className={s.groupe}
                style={{ left: x }}
                aria-label={`${g.ids.length} événements proches : ${titres}. Zoomer pour les séparer.`}
                onClick={() => ouvrirGroupe(g.debut, g.fin)}
              >
                <span className="date">{g.ids.length}</span>
              </button>
            );
          }
          const m = parId.get(g.ids[0])!;
          const haut = COULOIRS_MARQUEURS[i % COULOIRS_MARQUEURS.length];
          return (
            <div key={m.id}>
              <div className={s.tigeMarqueur} style={{ left: x, top: haut + 44, height: 210 - haut - 44 }} />
              <button
                type="button"
                data-marqueur
                className={`${s.marqueur} ${s[`etat_${m.etat ?? "neutre"}`]}`}
                style={{ left: clamp(x, 56, largeur - 56), top: haut }}
                aria-label={`${m.titre}, ${dateCourte(m.date)}`}
                onClick={() => onMarqueur?.(m.id)}
              >
                {m.motif && <Motif nom={m.motif} viewBox={m.motif === "bastille" ? "0 0 160 120" : "0 0 48 48"} />}
                <span>{m.titre}</span>
              </button>
            </div>
          );
        })}

        {correction && bonne && (
          <>
            <div className={s.tige} style={{ left: xBonne }} />
            <div className={s.puce} style={{ left: clamp(xBonne, largeurPuce / 2 + 2, largeur - largeurPuce / 2 - 2) }}>
              <span className="date">{dateCourte(bonne)}</span>
              {correction.titre}
            </div>
            {reponse && <div className={s.ecart} style={{ left: Math.min(xReponse, xBonne), width: Math.abs(xReponse - xBonne) }} />}
            <div className={s.bonne} style={{ left: xBonne }} />
            <div className={s.bonneEtiquette} style={{ left: clamp(xBonne, 110, largeur - 110) }}>
              Bonne réponse <b>{dateCourte(bonne)}</b>
            </div>
          </>
        )}

        {reponse && (
          <>
            <div
              className={s.losange}
              data-losange="oui"
              style={{ left: xReponse }}
              tabIndex={0}
              role="slider"
              aria-label="Votre réponse"
              aria-valuetext={dateCourte(reponse)}
              aria-valuenow={versT(reponse)}
              aria-valuemin={DEBUT_FRISE}
              aria-valuemax={FIN_FRISE}
            />
            <div
              className={enSaisie ? `${s.reponseEtiquette} ${s.enSaisie}` : s.reponseEtiquette}
              style={{ left: clamp(xReponse, 100, largeur - 100) }}
            >
              Votre réponse <b>{dateCourte(reponse)}</b>
            </div>
          </>
        )}

        {!selection && !corrige && (
          <div className={s.aide}>Molette ou pincement : zoom · Glisser : se déplacer</div>
        )}
        {selection && (
          <>
            <div className={s.aide}>Cliquez ou tapez la date · Molette : zoom · Glisser : se déplacer</div>
            {fantome && (
              <div className={s.fantome} style={{ left: fantome.x }}>
                <i />
                <span className="date">{dateCourte(fantome.date)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Annee({ annee }: { annee: number }) {
  if (annee > 0) return <>{texteAnnee(annee)}</>;
  return (
    <>
      {-annee}
      <small> av. J.-C.</small>
    </>
  );
}
