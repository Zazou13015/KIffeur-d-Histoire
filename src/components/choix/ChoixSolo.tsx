"use client";

import { useEffect, useState } from "react";
import { lancer } from "@/app/partie/actions";
import { DIFFICULTES, ecrireChoix, lireChoix, nombreQuestions, NIVEAU_PAR_DEFAUT, NIVEAUX, PACKS, PERIODES, THEMES, type Choix, type Longueur } from "@/lib/solo/choix";
import type { SoloDifficulty, SoloNiveau } from "@/lib/game/solo";
import { BarreLancer, ChoixDifficulte, ChoixNiveau, difficulteJouable, ecrireMemoire, Etape, lireMemoire } from "./communs";
import { LongueurPartie, useDisponibilite } from "./LongueurPartie";
import { BoutonMystere } from "./BoutonMystere";
import styles from "./choix.module.css";

const MEMOIRE = "histoire-choix-solo";
const MEMOIRE_INVERSE = "histoire-choix-inverse";
type ModeSolo = "general" | "periode" | "pack" | "theme";
type Etat = { mode: ModeSolo; periode: string; de: string; a: string; pack: string; theme: string; niveau: SoloNiveau; difficulte: SoloDifficulty; longueur: Longueur };

const ONGLETS: { mode: ModeSolo; titre: string }[] = [
  { mode: "general", titre: "Général" },
  { mode: "periode", titre: "Période" },
  { mode: "pack", titre: "Pack" },
  { mode: "theme", titre: "Thème" },
];

const DEPART: Etat = { mode: "general", periode: PERIODES[0].id, de: "", a: "", pack: PACKS[0].id, theme: THEMES[0].id, niveau: NIVEAU_PAR_DEFAUT, difficulte: "YEAR", longueur: 10 };

function versChamps(e: Etat, inverse: boolean) {
  const p = new URLSearchParams({ mode: e.mode, difficulte: e.difficulte, niveau: String(e.niveau), longueur: String(e.longueur) });
  if (inverse) p.set("sens", "inverse");
  if (e.mode === "periode") {
    p.set("periode", e.periode);
    if (e.periode === "libre") {
      p.set("de", e.de);
      p.set("a", e.a);
    }
  }
  if (e.mode === "pack") p.set("pack", e.pack);
  if (e.mode === "theme") p.set("theme", e.theme);
  return p;
}

function depuisMemoire(c: Choix): Etat | null {
  if (c.mode === "scolaire") return null;
  // Un gagnant récemment importé peut manquer aux tuiles statiques : garder
  // ses réglages sans bloquer le formulaire sur une tuile inexistante.
  const packConnu = PACKS.some((p) => p.id === c.pack);
  const themeConnu = THEMES.some((t) => t.id === c.theme);
  return {
    ...DEPART,
    mode: (c.mode === "pack" && !packConnu) || (c.mode === "theme" && !themeConnu) ? "general" : c.mode,
    difficulte: c.difficulte,
    longueur: c.longueur ?? 10,
    niveau: c.niveau ?? NIVEAU_PAR_DEFAUT,
    periode: c.periode ?? DEPART.periode,
    de: c.de != null ? String(c.de) : "",
    a: c.a != null ? String(c.a) : "",
    pack: packConnu ? c.pack! : DEPART.pack,
    theme: themeConnu ? c.theme! : DEPART.theme,
  };
}

function libelle(c: Choix) {
  if (c.mode === "periode") {
    const p = PERIODES.find((x) => x.id === c.periode);
    if (p) return p.nom;
    return `de ${c.de ?? "…"} à ${c.a ?? "aujourd'hui"}`;
  }
  if (c.mode === "pack") return `pack « ${PACKS.find((p) => p.id === c.pack)?.titre} »`;
  if (c.mode === "theme") return `thème « ${THEMES.find((t) => t.id === c.theme)?.nom} »`;
  return "toute l'Histoire";
}

export function ChoixSolo({ inverse = false }: { inverse?: boolean }) {
  const memoire = inverse ? MEMOIRE_INVERSE : MEMOIRE;
  const [etat, setEtat] = useState<Etat>(DEPART);
  const maj = (partiel: Partial<Etat>) => setEtat((e) => ({ ...e, ...partiel }));

  // Le dernier choix n'est connu que dans le navigateur : on le reprend après le premier affichage.
  useEffect(() => {
    const memorise = lireMemoire(memoire);
    const choix = memorise && lireChoix(memorise);
    const repris = choix && depuisMemoire(choix);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reprise unique du stockage local
    if (repris) setEtat(repris);
  }, [memoire]);

  const contenu = { mode: etat.mode, periode: etat.periode, pack: etat.pack, theme: etat.theme };
  // Inversé : toujours la date exacte, sans choix de précision.
  const precisions: SoloDifficulty[] = inverse ? ["DAY"] : ["YEAR", "MONTH", "DAY"];
  const niveau = etat.niveau;
  const selection = lireChoix(versChamps(etat, inverse));
  const disponibilite = useDisponibilite(selection);
  const comptes = disponibilite.comptes;
  const difficulte = inverse ? (comptes === null || comptes.DAY > 0 ? "DAY" : null) : difficulteJouable(comptes, etat.difficulte, 1);
  const choix = niveau && difficulte ? lireChoix(versChamps({ ...etat, niveau, difficulte }, inverse)) : null;
  const disponibles = difficulte ? comptes?.[difficulte] ?? null : comptes ? 0 : null;
  const nombre = nombreQuestions(etat.longueur, disponibles);
  const libreInvalide = etat.mode === "periode" && etat.periode === "libre" && !selection && (etat.de !== "" || etat.a !== "");

  return (
    <form action={lancer} onSubmit={() => choix && ecrireMemoire(memoire, ecrireChoix(choix))} className="grid gap-[22px]">
      {choix && <input type="hidden" name="c" value={ecrireChoix(choix)} />}

      <Etape numero={1} titre="Ce que tu veux réviser">
        <div className={styles.onglets} role="group" aria-label="Type de partie">
          {ONGLETS.map((o) => (
            <button key={o.mode} type="button" aria-pressed={etat.mode === o.mode} onClick={() => maj({ mode: o.mode })}>
              {o.titre}
            </button>
          ))}
        </div>

        {etat.mode === "general" && (
          <p className="m-0 text-encre-douce">Des questions tirées de toute l&apos;Histoire, de l&apos;Antiquité à nos jours.</p>
        )}

        {etat.mode === "periode" && (
          <>
            <ul className={styles.tuiles}>
              {PERIODES.map((p) => (
                <li key={p.id}>
                  <button type="button" className={styles.tuile} aria-pressed={etat.periode === p.id} onClick={() => maj({ periode: p.id })}>
                    <b>{p.nom}</b>
                    <small>{p.detail}</small>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={styles.tuile} aria-pressed={etat.periode === "libre"} onClick={() => maj({ periode: "libre" })}>
                  <b>Période libre</b>
                  <small>Tu choisis les années</small>
                </button>
              </li>
            </ul>
            {etat.periode === "libre" && (
              <div className={styles.libre}>
                <label>
                  De l&apos;année
                  <input inputMode="numeric" value={etat.de} placeholder="1789" onChange={(e) => maj({ de: e.target.value.replace(/[^\d-]/g, "") })} />
                </label>
                <label>
                  à l&apos;année
                  <input inputMode="numeric" value={etat.a} placeholder="1815" onChange={(e) => maj({ a: e.target.value.replace(/[^\d-]/g, "") })} />
                </label>
                <small className="text-encre-douce">Une case vide = sans limite. Avant J.-C. : un signe moins (−500).</small>
              </div>
            )}
            {libreInvalide && <p className={styles.alerte} role="alert">Vérifie les années : pas d&apos;année 0, et la première doit venir avant la seconde.</p>}
          </>
        )}

        {etat.mode === "pack" && (
          <ul className={styles.tuiles}>
            {PACKS.map((p) => (
              <li key={p.id}>
                <button type="button" className={styles.tuile} aria-pressed={etat.pack === p.id} onClick={() => maj({ pack: p.id })}>
                  <b>{p.titre}</b>
                  <small>{p.description}</small>
                </button>
              </li>
            ))}
          </ul>
        )}

        {etat.mode === "theme" && (
          <ul className={`${styles.tuiles} ${styles.petites}`}>
            {THEMES.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.tuile} aria-pressed={etat.theme === t.id} onClick={() => maj({ theme: t.id })}>
                  <b>{t.nom}</b>
                  <small>{t.n[2].YEAR} événements au catalogue</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Etape>

      <Etape numero={2} titre="Niveau">
        <ChoixNiveau contenu={contenu} precisions={precisions} valeur={niveau} onChange={(n) => maj({ niveau: n })} verifierCatalogue={false} />
      </Etape>

      {!inverse && (
        <Etape numero={3} titre="Précision">
          <ChoixDifficulte comptes={comptes} valeur={difficulte} onChange={(d) => maj({ difficulte: d })} minimum={1} />
        </Etape>
      )}

      <Etape numero={inverse ? 3 : 4} titre="Longueur de la partie">
        <LongueurPartie valeur={etat.longueur} disponibles={disponibles} erreur={disponibilite.erreur}
          reessayer={disponibilite.reessayer} onChange={(longueur) => maj({ longueur })} />
      </Etape>
      <BoutonMystere choix={ecrireChoix({ mode: "general", difficulte: inverse ? "DAY" : difficulte ?? etat.difficulte,
        niveau: etat.niveau, longueur: etat.longueur, ...(inverse ? { sens: "inverse" as const } : {}) })}
        memoriser={(c) => ecrireMemoire(memoire, c)} />
      <BarreLancer
        pret={choix != null && nombre !== null}
        resume={
          choix && nombre !== null ? <><b>{nombre} question{nombre > 1 ? "s" : ""}</b> · {libelle(choix)} · {NIVEAUX.find((n) => n.valeur === choix.niveau)?.titre} {inverse ? " · date exacte" : <> · {DIFFICULTES.find((d) => d.valeur === choix.difficulte)?.titre.toLowerCase()}</>}</>
            : disponibles !== null && disponibles > 0 ? "Choisis une longueur disponible pour jouer." : "Termine ton choix et vérifie les questions disponibles."
        }
      />
    </form>
  );
}
