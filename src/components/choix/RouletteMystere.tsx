"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Motif } from "@/components/charte/Motif";
import { bandeMystere, INDEX_GAGNANT, type TirageMystere } from "@/lib/solo/mystere";
import styles from "./mystere.module.css";

const MOTIFS = ["amphore", "colonne", "parchemin", "donjon", "ecu", "pyramide"];
export const DUREE_ROULETTE = 4000;
export const DUREE_ANNONCE = 900;
const lirePreference = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function abonnerPreference(notifier: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notifier);
  return () => media.removeEventListener("change", notifier);
}

export function RouletteMystere({ tirage, terminer }: { tirage: TirageMystere; terminer: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saute = useRef(false);
  const [arretee, setArretee] = useState(false);
  const reduite = useSyncExternalStore(abonnerPreference, lirePreference, () => false);
  const terminee = arretee || reduite;
  const arreter = useCallback(() => { saute.current = true; setArretee(true); }, []);
  const bande = bandeMystere(tirage.candidats, tirage.gagnant);
  useEffect(() => {
    const modale = dialog.current;
    modale?.showModal();
    const timer = setTimeout(arreter, DUREE_ROULETTE);
    return () => { clearTimeout(timer); modale?.close(); };
  }, [arreter]);
  useEffect(() => {
    if (!terminee) return;
    const timer = setTimeout(terminer, DUREE_ANNONCE);
    return () => clearTimeout(timer);
  }, [terminee, terminer]);

  const arrivee = -(INDEX_GAGNANT * 176 + 82);
  const variables = { "--arrivee": `${arrivee}px`, "--rebond-avant": `${arrivee - 12}px`,
    "--rebond-apres": `${arrivee + 6}px` } as CSSProperties;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="titre-roulette"
    onCancel={(e) => { e.preventDefault(); arreter(); }}>
    <p className={styles.cartel}>Cabinet de curiosités · Tirage surprise</p>
    <h2 id="titre-roulette">Thème mystère</h2>
    <p className={styles.aide}>Laisse le hasard choisir ta prochaine découverte.</p>
    <div className={styles.fenetre} data-arretee={terminee} aria-hidden="true">
      <span className={styles.repere} />
      <div className={styles.bande} style={variables} onAnimationEnd={() => { if (!saute.current) arreter(); }}>
        {bande.map((carte, i) => <div key={i} className={styles.carte} data-gagnante={terminee && i === INDEX_GAGNANT}>
          <Motif nom={MOTIFS[i % MOTIFS.length]} className={styles.motif} />
          <small>{carte.mode === "pack" ? "Pack" : "Thème"}</small><b>{carte.titre}</b>
        </div>)}
      </div>
    </div>
    <p className={styles.annonce} role="status">{terminee ? `C'est parti : ${tirage.gagnant.titre}` : "La roulette tourne…"}</p>
    <button type="button" className={styles.passer} onClick={arreter} disabled={terminee}>
      {terminee ? "En route…" : "Passer"}
    </button>
  </dialog>;
}
