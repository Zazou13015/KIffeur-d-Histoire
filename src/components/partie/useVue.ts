"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Precision } from "@/lib/game/dates";
import { borner, VUE_DE_BASE, type Vue } from "@/lib/game/frise";

// Plage visible de la frise, avec zoom animé (sauf si l'utilisateur réduit les animations).
export function useVue(precision: Precision) {
  const [vue, setVueBrute] = useState<Vue>(VUE_DE_BASE);
  const vueRef = useRef(vue);
  const anim = useRef<number | null>(null);

  const placer = useCallback(
    (debut: number, fin: number) => {
      const v = borner(debut, fin, precision);
      vueRef.current = v;
      setVueBrute(v);
    },
    [precision],
  );

  const arreter = useCallback(() => {
    if (anim.current != null) cancelAnimationFrame(anim.current);
    anim.current = null;
  }, []);

  const animer = useCallback(
    (debut: number, fin: number) => {
      arreter();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return placer(debut, fin);
      const depart = vueRef.current;
      const t0 = performance.now();
      const etape = (t: number) => {
        const k = Math.min(1, (t - t0) / 480);
        const q = 1 - Math.pow(1 - k, 3);
        placer(depart.debut + (debut - depart.debut) * q, depart.fin + (fin - depart.fin) * q);
        anim.current = k < 1 ? requestAnimationFrame(etape) : null;
      };
      anim.current = requestAnimationFrame(etape);
    },
    [arreter, placer],
  );

  const zoomer = useCallback(
    (facteur: number) => {
      const { debut, fin } = vueRef.current;
      const c = (debut + fin) / 2;
      animer(c - (c - debut) * facteur, c + (fin - c) * facteur);
    },
    [animer],
  );

  useEffect(() => arreter, [arreter]);

  return { vue, vueRef, placer, animer, zoomer, arreter };
}
