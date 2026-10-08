"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { empiler, regrouper, type MarqueurFrise } from "@/lib/game/marqueurs";
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
  /** Variante opt-in de /apprendre ; le rendu compact des autres écrans est conservé. */
  presentationMarqueurs?: "compacte" | "illustree";
  /** Toutes les cartes restent visibles : pas de groupes, elles s'empilent en couloirs au-dessus de l'axe. */
  toutVoir?: boolean;
  /** La frise remplit son conteneur (comme l'écran de jeu), sans boîte posée dessus. */
  remplir?: boolean;
  onMarqueur?: (id: string) => void;
  /**
   * Écran de jeu : la frise occupe toute la scène, avec une boîte en haut (la question) et une boîte en bas (la réponse)
   * posées sur son fond. Les clics hors des boîtes continuent de placer la réponse.
   */
  haut?: ReactNode;
  /** Sous l'axe, directement sous la frise (bande des époques). */
  sous?: ReactNode;
  /** En bas de la scène. Chaque boîte se déclare elle-même avec `data-superposition`. */
  bas?: ReactNode;
};

// Place minimale entre deux marqueurs avant qu'ils se regroupent, et couloirs où ils se posent.
const ECART_MARQUEURS = 132;
const COULOIRS_MARQUEURS = [10, 62, 114];
const ECART_MARQUEURS_ILLUSTRES = 144;
// Le troisième cartel (52 px + filet actif) s'arrête avant les groupes à 172 px.
const COULOIRS_MARQUEURS_ILLUSTRES = [6, 62, 118];

const PUCE_MAX = 260;

// Largeur de texte pour garder l'étiquette de la bonne réponse dans le cadre.
function largeurTexte(texte: string): number {
  return Math.min(PUCE_MAX, texte.length * 7 + 22);
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
  presentationMarqueurs = "compacte",
  toutVoir = false,
  remplir = false,
  onMarqueur,
  haut,
  sous,
  bas,
}: Props) {
  const interne = useVue(precision);
  const { vue, vueRef, placer, animer, zoomer, arreter } = controle ?? interne;
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(800);
  // Écran de jeu : hauteur de la scène et des boîtes posées en haut et en bas, pour placer l'axe.
  const [hauteur, setHauteur] = useState(0);
  const [hautHaut, setHautHaut] = useState(0);
  const [hautBas, setHautBas] = useState(0);
  const refHaut = useRef<HTMLDivElement>(null);
  const refBas = useRef<HTMLDivElement>(null);
  const [fantome, setFantome] = useState<{ x: number; date: HistoricDate } | null>(null);
  const glisse = useRef<{ x: number; vue: Vue; bouge: boolean; losange: boolean } | null>(null);
  const pointeurs = useRef(new Map<number, number>());
  const pincement = useRef<{ ecart: number; vue: Vue; milieu: number } | null>(null);
  const corrige = correction != null;
  const selection = mode === "selection" && !corrige && onReponse != null;
  const aDesMarqueurs = marqueurs != null && marqueurs.length > 0;
  const illustree = presentationMarqueurs === "illustree";

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

  // Mesure avant le premier affichage : l'axe ne saute pas au chargement.
  useLayoutEffect(() => {
    const el = ref.current!;
    const mesurer = () => {
      setLargeur(el.clientWidth);
      setHauteur(el.clientHeight);
      setHautHaut(refHaut.current?.offsetHeight ?? 0);
      setHautBas(refBas.current?.offsetHeight ?? 0);
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    if (refHaut.current) ro.observe(refHaut.current);
    if (refBas.current) ro.observe(refBas.current);
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
    if ((e.target as HTMLElement).closest("[data-marqueur], [data-superposition]")) return;
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
    // Sur une boîte de la scène (question, réponse) : ni repère fantôme ni glissement.
    if ((e.target as HTMLElement).closest("[data-superposition]")) return setFantome(null);
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
    // Dans les cases de la saisie, les flèches déplacent le curseur de texte, pas la réponse.
    if ((e.target as HTMLElement).closest("input, textarea")) return;
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
  const groupes = !aDesMarqueurs ? [] : toutVoir
    ? tries.filter((m) => m.t >= vue.debut && m.t <= vue.fin).map((m) => ({ t: m.t, debut: m.t, fin: m.t, ids: [m.id] }))
     : regrouper(tries, vue, largeur, illustree ? ECART_MARQUEURS_ILLUSTRES : ECART_MARQUEURS, precision);

  // Un groupe s'ouvre en zoomant dessus ; une carte seule prévient l'écran qui l'affiche.
  function ouvrirGroupe(debut: number, fin: number) {
    const marge = Math.max((fin - debut) * 0.5, (vue.fin - vue.debut) * 0.08);
    if (illustree) {
      // Sur mobile un groupe peut contenir tout le chapitre : chaque clic doit
      // rapprocher les dates, même si la marge habituelle élargirait la vue.
      const etendue = Math.min(fin - debut + 2 * marge, span * 0.6);
      const centre = (debut + fin) / 2;
      animer(centre - etendue / 2, centre + etendue / 2);
      return;
    }
    animer(debut - marge, fin + marge);
  }

  const scene = remplir || haut != null || bas != null || sous != null;
  // La frise remplit l'écran : l'axe descend au-dessus des boîtes du bas, le ciel du décor occupe tout l'espace au-dessus.
  const ciel = hautHaut + 16;
  // Sans boîte en bas (`remplir`), l'axe descend jusqu'aux graduations.
  const axeY = !scene ? 210 : remplir && bas == null && sous == null ? Math.max(ciel + 150, hauteur - 54) : Math.max(ciel + 200, hauteur - hautBas - 140);
  const decalage = axeY - 210;
  const echelleDecor = scene ? clamp((axeY - ciel) / 220, 1, 1.7) : 1;
  const placerMotif = (haut: number, taille: number) => {
    if (!scene) return { top: haut, taille };
    const t2 = taille * echelleDecor;
    // Couloirs d'origine 14…125 étalés de haut en bas du ciel.
    return { top: ciel - decalage + ((haut - 14) / 111) * Math.max(0, axeY - 60 - ciel - t2), taille: t2 };
  };
  // Cartes toujours visibles : couloirs empilés au-dessus du bandeau des époques (172 px dans la bande).
  const tailleCarte = (m: MarqueurFrise) => {
    const miniature = illustree && m.illustration;
    return { hauteur: illustree ? (miniature ? 52 : 44) : 52, demi: illustree ? (miniature ? 72 : 56) : 66 };
  };
  const PAS_COULOIR = 56;
  const ECART_BANDEAU = 6;
  // Couloir 0 posé sur le bandeau (38 px au-dessus de l'axe), les suivants empilés jusqu'au haut de la frise.
  const couloirsEmpiles = toutVoir
    ? empiler(
        groupes.map((g) => ({ x: X(g.t), demi: tailleCarte(parId.get(g.ids[0])!).demi })),
        largeur,
        1 + Math.floor(((scene ? axeY - ciel : 210) - 38 - ECART_BANDEAU - 52) / PAS_COULOIR),
      )
    : [];
  const outils = (
    <div className={s.outils}>
      <span className={s.echelle}>{legendePas(pas)}</span>
      <button type="button" onClick={() => zoomer(2)} aria-label="Dézoomer">−</button>
      <button type="button" onClick={() => zoomer(0.5)} aria-label="Zoomer">+</button>
    </div>
  );

  return (
    <>
      {!scene && outils}
      <div
        ref={ref}
        className={`${selection ? s.frise : `${s.frise} ${s.lecture}`}${scene ? ` ${s.scene}` : ""}`}
        style={scene ? { minHeight: remplir && bas == null && sous == null ? hautHaut + 240 : hautHaut + hautBas + 380 } : undefined}
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
        {scene && (
          <div ref={refHaut} className={s.zoneScene}>
            {haut != null && <div data-superposition className={s.superposition}>{haut}</div>}
            <div data-superposition className={toutVoir && remplir ? `${s.outilsScene} ${s.outilsBas}` : s.outilsScene}
              style={toutVoir && remplir ? { top: axeY + 10 } : undefined}>{outils}</div>
          </div>
        )}
        <div className={scene ? s.bandeScene : s.bande} style={scene ? { top: decalage } : undefined}>
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
              {x > 50 && x < largeur - 50 && (g.texte || g.annee != null) && (
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

        {!aDesMarqueurs && decor(vue, largeur, scene ? 90 : 34).map((m) => {
          const { top, taille } = placerMotif(m.haut, m.taille);
          return (
            <div
              key={m.cle}
              className={m.discret ? `${s.motif} ${s.discret}` : s.motif}
              style={{ left: m.x, top, width: taille, height: taille, transform: `translateX(-50%) rotate(${m.angle}deg)` }}
            >
              <Motif nom={m.motif} />
            </div>
          );
        })}

        {groupes.map((g, i) => {
          const x = X(g.t);
          if (g.ids.length > 1) {
            const titres = g.ids.map((id) => parId.get(id)!.titre).join(", ");
            const actif = illustree && g.ids.some(id => parId.get(id)?.etat === "actif");
            return (
              <button
                key={g.ids.join("|")}
                type="button"
                data-marqueur
                className={`${s.groupe}${actif ? ` ${s.groupeActif}` : ""}`}
                style={{ left: illustree ? clamp(x, 24, largeur - 24) : x }}
                aria-label={`${g.ids.length} événements proches : ${titres}. Zoomer pour les séparer.`}
                aria-pressed={illustree ? actif : undefined}
                onClick={() => ouvrirGroupe(g.debut, g.fin)}
              >
                <span className="date">{g.ids.length}</span>
              </button>
            );
          }
          const m = parId.get(g.ids[0])!;
          const couloirs = illustree ? COULOIRS_MARQUEURS_ILLUSTRES : COULOIRS_MARQUEURS;
          const miniature = illustree && m.illustration;
          const { hauteur, demi: demiLargeur } = tailleCarte(m);
          const haut = toutVoir ? 172 - ECART_BANDEAU - hauteur - couloirsEmpiles[i].couloir * PAS_COULOIR : couloirs[i % couloirs.length];
          return (
            <div key={m.id}>
              <div className={s.tigeMarqueur} style={{ left: x, top: haut + hauteur, height: 210 - haut - hauteur }} />
              <button
                type="button"
                data-marqueur
                className={`${s.marqueur}${illustree ? ` ${s.marqueurPedagogique}` : ""}${miniature ? ` ${s.marqueurIllustre}` : ""} ${s[`etat_${m.etat ?? "neutre"}`]}`}
                style={{ left: toutVoir ? couloirsEmpiles[i].centre : clamp(x, demiLargeur, largeur - demiLargeur), top: haut }}
                aria-label={`${m.titre}, ${dateCourte(m.date)}`}
                aria-pressed={illustree ? m.etat === "actif" : undefined}
                onClick={() => onMarqueur?.(m.id)}
              >
                {miniature ? (
                  // eslint-disable-next-line @next/next/no-img-element -- SVG minuscule déjà optimisé, URL applicative de card_id
                  <img src={m.illustration} alt="" width={48} height={36} loading="lazy" decoding="async" />
                ) : m.motif && <Motif nom={m.motif} viewBox={m.motif === "bastille" ? "0 0 160 120" : "0 0 48 48"} />}
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

        {!scene && !selection && !corrige && (
          <div className={s.aide}>Molette ou pincement : zoom · Glisser : se déplacer</div>
        )}
        {selection && (
          <>
            {!scene && <div className={s.aide}>Cliquez ou tapez la date · Molette : zoom · Glisser : se déplacer</div>}
            {fantome && (
              <div className={s.fantome} style={scene ? { left: fantome.x, top: ciel - decalage, height: 222 - ciel + decalage } : { left: fantome.x }}>
                <i />
                <span className="date">{dateCourte(fantome.date)}</span>
              </div>
            )}
          </>
        )}
        </div>
        {scene && (
          <div ref={refBas} className={s.zoneBasScene}>
            {sous != null && <div data-superposition className={s.zoneSous}>{sous}</div>}
            {bas != null && <div className={s.zoneBas}>{bas}</div>}
          </div>
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
