"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoricDate, Precision } from "@/lib/game/dates";
import { REGLAGES, versT } from "@/lib/game/frise";
import { casesCompletes, casesVides, champsDepuis, CHAMPS_VIDES, reponseDepuis, type Champs } from "@/lib/game/saisie";
import type { useVue } from "@/components/frise/useVue";
import type { MethodeSaisie } from "@/lib/game/solo";

// Relie les trois cases et la frise : ce qu'on tape place le losange et zoome la frise,
// ce qu'on pointe sur la frise remplit les cases.
export function useSaisieFrise(precision: Precision, controle: ReturnType<typeof useVue>) {
  const { vueRef, animer, bornes } = controle;
  const [champs, setChamps] = useState<Champs>(CHAMPS_VIDES);
  const [reponse, setReponse] = useState<HistoricDate | null>(null);
  const [enSaisie, setEnSaisie] = useState(false);
  // Dernière façon dont la réponse a été donnée, pour les indicateurs (#26).
  const [methode, setMethode] = useState<MethodeSaisie | null>(null);
  const suivi = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(suivi.current), []);

  const complete = reponse != null && casesCompletes(champs, precision);

  function changerChamps(c: Champs) {
    setChamps(c);
    setMethode("clavier");
    clearTimeout(suivi.current);
    if (casesVides(c, precision)) {
      // Cases vidées : plus de losange, la frise revient sur toute l'histoire (ou toute la période jouée).
      setReponse(null);
      animer(bornes.debut, bornes.fin);
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
    clearTimeout(suivi.current);
    setReponse(d);
    setChamps(champsDepuis(d));
    setMethode("frise");
  }

  function reinitialiser() {
    clearTimeout(suivi.current);
    setReponse(null);
    setChamps(CHAMPS_VIDES);
    setMethode(null);
    animer(bornes.debut, bornes.fin);
  }

  return { champs, reponse, methode, complete, enSaisie, setEnSaisie, changerChamps, poserSurFrise, reinitialiser };
}
