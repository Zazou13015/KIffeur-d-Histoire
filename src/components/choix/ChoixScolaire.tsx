"use client";

import { useEffect, useState } from "react";
import { lancer } from "@/app/partie/actions";
import { NIVEAUX } from "@/lib/apprendre/catalogue";
import { CHAPITRES, comptesDe, DIFFICULTES, ecrireChoix, lireChoix, QUESTIONS } from "@/lib/solo/choix";
import type { SoloDifficulty } from "@/lib/game/solo";
import { BarreLancer, ChoixDifficulte, difficulteJouable, ecrireMemoire, Etape, lireMemoire } from "./communs";
import styles from "./choix.module.css";

const MEMOIRE = "histoire-choix-scolaire";
const MEMOIRE_INVERSE = "histoire-choix-inverse-scolaire";
const duNiveau = (niveau: string) => CHAPITRES.filter((c) => c.niveauSlug === niveau);

export function ChoixScolaire({ inverse = false }: { inverse?: boolean }) {
  const memoire = inverse ? MEMOIRE_INVERSE : MEMOIRE;
  const [niveau, setNiveau] = useState<string | null>(null);
  const [coches, setCoches] = useState<string[]>([]);
  // Difficulté proposée par défaut : l'année seule, comme dans les manuels.
  const [difficulte, setDifficulte] = useState<SoloDifficulty>("YEAR");

  // Reprend le dernier choix du joueur, connu seulement du navigateur.
  useEffect(() => {
    const memorise = lireMemoire(memoire);
    const choix = memorise && lireChoix(memorise);
    if (!choix?.chapitres) return;
    const premier = CHAPITRES.find((c) => c.id === choix.chapitres![0])!;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reprise unique du stockage local
    setNiveau(premier.niveauSlug);
    setCoches(choix.chapitres.filter((id) => CHAPITRES.find((c) => c.id === id)?.niveauSlug === premier.niveauSlug));
    setDifficulte(choix.difficulte);
  }, [memoire]);

  const choisirNiveau = (slug: string) => {
    setNiveau(slug);
    setCoches(duNiveau(slug).map((c) => c.id));
  };
  const basculer = (id: string) => setCoches((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const chapitres = niveau ? duNiveau(niveau) : [];
  const comptes = coches.length ? comptesDe({ mode: "scolaire", chapitres: coches }) : null;
  const jouable = difficulteJouable(comptes, difficulte);
  const choix = jouable ? lireChoix(new URLSearchParams({ mode: "scolaire", difficulte: jouable, chapitres: coches.join(","), ...(inverse ? { sens: "inverse" } : {}) })) : null;
  const nomNiveau = NIVEAUX.find((n) => n.slug === niveau)?.nom;

  return (
    <form action={lancer} onSubmit={() => choix && ecrireMemoire(memoire, ecrireChoix(choix))} className="grid gap-[22px]">
      {choix && <input type="hidden" name="c" value={ecrireChoix(choix)} />}

      <Etape numero={1} titre="Ton niveau">
        <ul className={`${styles.tuiles} ${styles.petites}`}>
          {NIVEAUX.map((n) => (
            <li key={n.slug}>
              <button type="button" className={styles.tuile} aria-pressed={niveau === n.slug} onClick={() => choisirNiveau(n.slug)}>
                <b>{n.nom}</b>
                <small>{duNiveau(n.slug).length} chapitres</small>
              </button>
            </li>
          ))}
        </ul>
      </Etape>

      {niveau && (
        <Etape numero={2} titre="Les chapitres à réviser">
          <div className="flex flex-wrap gap-x-4 text-sm">
            <button type="button" className="cible underline" onClick={() => setCoches(chapitres.map((c) => c.id))}>Tout cocher</button>
            <button type="button" className="cible underline" onClick={() => setCoches([])}>Tout décocher</button>
          </div>
          <ul className={`${styles.tuiles} ${styles.larges}`}>
            {chapitres.map((c) => (
              <li key={c.id}>
                <label className={`${styles.tuile} ${styles.case}`}>
                  <input type="checkbox" checked={coches.includes(c.id)} onChange={() => basculer(c.id)} />
                  <span className={styles.coche} aria-hidden="true">{coches.includes(c.id) ? "✓" : ""}</span>
                  <b>{c.titre}</b>
                </label>
              </li>
            ))}
          </ul>
        </Etape>
      )}

      {niveau && (
        <Etape numero={3} titre="Difficulté">
          <ChoixDifficulte comptes={comptes} valeur={jouable} onChange={setDifficulte} />
        </Etape>
      )}

      <BarreLancer
        pret={choix != null}
        resume={
          choix ? (
            <><b>{QUESTIONS} questions</b> · {nomNiveau}, {coches.length} chapitre{coches.length > 1 ? "s" : ""} · {DIFFICULTES.find((d) => d.valeur === jouable)?.titre}</>
          ) : !niveau ? "Choisis ton niveau." : !coches.length ? "Coche au moins un chapitre." : "Pas assez de questions : coche d'autres chapitres."
        }
      />
    </form>
  );
}
