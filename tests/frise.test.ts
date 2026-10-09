import { describe, expect, it } from "vitest";
import { aLaPrecision, type HistoricDate, type Precision } from "@/lib/game/dates";
import { borner, DEBUT_FRISE, depuisT, FIN_FRISE, versT } from "@/lib/game/frise";
import { regrouper } from "@/lib/game/marqueurs";

describe("position <-> date sur la frise", () => {
  it("rend la même année pour une année posée sur sa graduation", () => {
    for (const year of [-3000, -753, -44, -1, 1, 476, 1789, 2024]) {
      expect(depuisT(versT({ year }), "annee")).toEqual({ year });
    }
  });

  it("n'a pas d'année 0 : 1 av. J.-C. est suivi de 1", () => {
    expect(versT({ year: 1 }) - versT({ year: -1 })).toBe(1);
    expect(depuisT(0, "annee")).toEqual({ year: -1 });
    expect(depuisT(0.4, "annee")).toEqual({ year: -1 });
    expect(depuisT(0.6, "annee")).toEqual({ year: 1 });
  });

  it("arrondit à l'année en précision Année", () => {
    expect(depuisT(1789.49, "annee")).toEqual({ year: 1789 });
    expect(depuisT(1789.51, "annee")).toEqual({ year: 1790 });
  });

  it("arrondit au mois en difficulté moyenne", () => {
    expect(depuisT(1789 + 0.05, "mois")).toEqual({ year: 1789, month: 1 });
    expect(depuisT(1789 + 6.5 / 12, "mois")).toEqual({ year: 1789, month: 7 });
    expect(depuisT(1789 + 11.9 / 12, "mois")).toEqual({ year: 1789, month: 12 });
  });

  it("donne le jour exact en précision Jour, y compris le 29 février", () => {
    const d: HistoricDate = { year: 1789, month: 7, day: 14 };
    expect(depuisT(versT(d), "jour")).toEqual(d);
    const bissextile: HistoricDate = { year: 1796, month: 2, day: 29 };
    expect(depuisT(versT(bissextile), "jour")).toEqual(bissextile);
    const av: HistoricDate = { year: -753, month: 4, day: 21 };
    expect(depuisT(versT(av), "jour")).toEqual(av);
  });

  it.each<[Precision, HistoricDate]>([
    ["annee", { year: 1455 }],
    ["mois", { year: 843, month: 8 }],
    ["jour", { year: 1940, month: 6, day: 18 }],
  ])("aller-retour sans perte à la précision %s", (precision, date) => {
    expect(depuisT(versT(date), precision)).toEqual(date);
  });
});

describe("limites de la vue", () => {
  it("ne dépasse jamais la frise", () => {
    const v = borner(-9999, 9999, "annee");
    expect(v.debut).toBe(DEBUT_FRISE);
    expect(v.fin).toBe(FIN_FRISE);
  });

  it("garde un zoom minimal selon la précision", () => {
    expect(borner(1789, 1789, "annee").fin - 1789).toBeGreaterThan(0);
    const jour = borner(1789.5, 1789.5, "jour");
    expect(jour.fin - jour.debut).toBeCloseTo(0.03, 5);
  });
});

describe("regroupement des marqueurs", () => {
  const vue = { debut: 0, fin: 2000 };
  const marqueurs = [100, 110, 120, 900, 1500].map((t) => ({ id: `m${t}`, t }));

  it("regroupe les marqueurs trop proches pour rester lisibles", () => {
    // 800 px pour 2000 ans : 0,4 px par an, donc 100 ans d'écart = 40 px.
    const g = regrouper(marqueurs, vue, 800, 92, "annee");
    expect(g.map((x) => x.ids)).toEqual([["m100", "m110", "m120"], ["m900"], ["m1500"]]);
    expect(g[0].debut).toBe(100);
    expect(g[0].fin).toBe(120);
  });

  it("sépare les marqueurs quand on zoome", () => {
    const g = regrouper(marqueurs, { debut: 90, fin: 130 }, 800, 92, "annee");
    expect(g.map((x) => x.ids.length)).toEqual([1, 1, 1]);
  });

  it("ne garde que la plage visible", () => {
    const g = regrouper(marqueurs, { debut: 800, fin: 1000 }, 800, 92, "annee");
    expect(g.map((x) => x.ids)).toEqual([["m900"]]);
  });

  it("ne regroupe plus les dates identiques quand la frise ne peut plus zoomer", () => {
    const memeDate = [{ id: "a", t: 1789.5 }, { id: "b", t: 1789.5 }];
    const g = regrouper(memeDate, { debut: 1789.3, fin: 1789.8 }, 800, 92, "annee");
    expect(g).toHaveLength(2);
  });

  it("reste rapide avec 200 marqueurs", () => {
    const beaucoup = Array.from({ length: 200 }, (_, i) => ({ id: `e${i}`, t: -3000 + i * 25 }));
    const debut = performance.now();
    for (let i = 0; i < 1000; i++) regrouper(beaucoup, { debut: -3500, fin: 2030 }, 1000, 92, "annee");
    expect(performance.now() - debut).toBeLessThan(500);
  });
});

describe("bonne réponse à la précision jouée", () => {
  it("ne garde que l'année en précision Année et le mois en précision Mois", () => {
    const bastille = { year: 1789, month: 7, day: 14 };
    expect(aLaPrecision(bastille, "annee")).toEqual({ year: 1789 });
    expect(aLaPrecision(bastille, "mois")).toEqual({ year: 1789, month: 7 });
    expect(aLaPrecision(bastille, "jour")).toEqual(bastille);
  });
});
