"use client";

import { useEffect, useRef } from "react";
import { marquerChapitreDecouvert } from "@/app/apprendre/actions";
import { noterDecouvertSession } from "@/lib/progression/session";

// Ne rend rien : à l'ouverture d'un chapitre, le marque « découvert » dans le compte du joueur connecté,
// ou dans la session du navigateur sinon. La page reste statique et anonyme.
export function SuiviDecouverte({ chapitre }: { chapitre: string }) {
  const fait = useRef(false);
  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    marquerChapitreDecouvert(chapitre).then((enregistre) => { if (!enregistre) noterDecouvertSession(chapitre); }).catch(() => noterDecouvertSession(chapitre));
  }, [chapitre]);
  return null;
}
