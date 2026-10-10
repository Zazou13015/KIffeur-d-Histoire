import { describe, expect, it } from "vitest";
import { appreciation, cadrerBilan, groupesBilan, raisonSansEcart, reponsesBilan } from "@/lib/game/bilan";
import { choisirPas, depuisT, graduations, versT } from "@/lib/game/frise";
import { fixtureBilan, partieBilan } from "./fixtures/bilan";
import { aLaPrecision } from "@/lib/game/dates";

describe("présentation des vrais contrats SoloResult", () => {
  it("reprend points, précision et écarts du serveur, sans recalcul", () => {
    const qs = reponsesBilan(partieBilan);
    expect(qs).toHaveLength(10);
    expect(qs[2]).toMatchObject({ points: 86, accuracy: 96, ecart: "2 ans", exacte: false });
    expect(qs.filter((q) => q.exacte)).toHaveLength(3);
    expect(reponsesBilan(fixtureBilan("inverse"))[2]).toMatchObject({ texteJoueur: "Bataille d’Alésia", dateJoueur: null, exacte: true });
  });
  it("distingue zéro, moyen, bon et excellent, y compris une partie courte", () => {
    expect(appreciation(0, 1000)).toBe("L’Histoire continue.");
    expect(appreciation(500, 1000)).toBe("Vos repères prennent forme.");
    expect(appreciation(726, 1000)).toBe("Une belle traversée.");
    expect(appreciation(300, 300)).toBe("Une traversée remarquable.");
    expect(appreciation(0, 0)).toBe("L’Histoire continue.");
    expect(reponsesBilan(fixtureBilan("maximum")).every((q) => q.exacte)).toBe(true);
    expect(reponsesBilan(fixtureBilan("zero")).some((q) => q.exacte)).toBe(false);
  });
  it("ne représente aucune date inventée pour expiration, absence ou inverse", () => {
    for (const q of [reponsesBilan(partieBilan)[9], reponsesBilan(fixtureBilan("absente"))[2]]) {
      expect(q.dateJoueur).toBeNull(); expect(q.exacte).toBe(false);
      expect(raisonSansEcart(q, false)).toMatch(/seule la date attendue/);
    }
    expect(raisonSansEcart(reponsesBilan(fixtureBilan("inverse"))[2], true)).toMatch(/événement/);
    const r = structuredClone(partieBilan);
    r.questions[2].unit = "DAY";
    expect(reponsesBilan(r)[2].dateJoueur).toBeNull();
  });
  it.each(["classique", "eloignee", "maximum", "jour", "mois"])("cadre les deux dates sans limites de gameplay : %s", (cas) => {
    const qs = reponsesBilan(fixtureBilan(cas));
    for (const q of qs) {
      const vue = cadrerBilan([q], q.precision);
      for (const d of [q.attendue, q.dateJoueur].filter((v) => v !== null)) {
        expect(versT(d)).toBeGreaterThan(vue.debut);
        expect(versT(d)).toBeLessThan(vue.fin);
      }
      expect(graduations(vue, choisirPas(vue, 280, q.precision)).some((g) => g.texte === "0" || g.annee === 0)).toBe(false);
    }
  });
  it("réutilise la chronologie historique sans année zéro, y compris jour/mois avant J.-C.", () => {
    expect(versT({ year: 1 }) - versT({ year: -1 })).toBe(1);
    for (const precision of ["annee", "mois", "jour"] as const) {
      const d = { year: -52, month: 7, day: 14 };
      expect(depuisT(versT(aLaPrecision(d, precision)), precision).year).toBe(-52);
    }
  });
  it("regroupe les dates identiques et proches selon l'espace disponible", () => {
    const qs = reponsesBilan(fixtureBilan("maximum"));
    qs[1].attendue = qs[0].attendue;
    const vue = cadrerBilan(qs, "annee");
    const gs = groupesBilan(qs, vue, 280, 92);
    expect(gs.some((g) => g.indices.includes(0) && g.indices.includes(1))).toBe(true);
    expect(gs.flatMap((g) => g.indices).sort((a, b) => a - b)).toEqual(qs.map((_, i) => i));
  });
});
