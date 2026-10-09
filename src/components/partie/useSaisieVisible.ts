"use client";

import { useEffect, type RefObject } from "react";

/**
 * Téléphone : quand le clavier virtuel s'ouvre et réduit l'écran, la case en cours de saisie
 * revient dans la partie visible au lieu de rester cachée sous le clavier (#28).
 */
export function useSaisieVisible(ecran: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const surRedimension = () => {
      const actif = document.activeElement;
      if (actif instanceof HTMLInputElement && ecran.current?.contains(actif)) actif.scrollIntoView({ block: "nearest" });
    };
    vv.addEventListener("resize", surRedimension);
    return () => vv.removeEventListener("resize", surRedimension);
  }, [ecran]);
}
