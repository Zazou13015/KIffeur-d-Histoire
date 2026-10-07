import type { CartePedagogique } from "@/lib/pedagogie";
import type { HistoricDate } from "@/lib/game/dates";
import { borner, DEBUT_FRISE, FIN_FRISE, versT, type Vue } from "@/lib/game/frise";
import type { MarqueurFrise } from "@/lib/game/marqueurs";
import { motifChapitre } from "./catalogue";

// Le début ancre également les plages ; le libellé complet reste affiché.
export function debutCarte(c: CartePedagogique): HistoricDate | null {
  return c.start_year == null ? null : {
    year: c.start_year,
    ...(c.start_month == null ? {} : { month: c.start_month }),
    ...(c.start_day == null ? {} : { day: c.start_day }),
  };
}
export function cadrageChapitre(cartes: CartePedagogique[]): { plage: Vue; bornes: Vue } {
  const positions = cartes.flatMap((c) => {
    const debut = debutCarte(c);
    if (!debut) return [];
    return [versT(debut), ...(c.end_year == null ? [] : [versT({ year: c.end_year, month: c.end_month ?? undefined, day: c.end_day ?? undefined })])];
  });
  if (!positions.length) return { plage: { debut: DEBUT_FRISE, fin: FIN_FRISE }, bornes: { debut: DEBUT_FRISE, fin: FIN_FRISE } };
  const debut = Math.min(...positions), fin = Math.max(...positions);
  const marge = Math.max((fin - debut) * 0.12, 0.1);
  const bornes = { debut: Math.min(DEBUT_FRISE, debut - marge), fin: Math.max(FIN_FRISE, fin + marge) };
  return { plage: borner(debut - marge, fin + marge, "jour", bornes), bornes };
}
export function marqueursCartes(cartes: CartePedagogique[], actif: string | null): MarqueurFrise[] {
  return cartes.flatMap((c) => {
    const date = debutCarte(c);
    return date ? [{ id: c.card_id, titre: c.title, date, motif: motifChapitre(c.chapter_id), etat: c.card_id === actif ? "actif" as const : "neutre" as const }] : [];
  });
}
