import { describe, expect, it } from "vitest";
import { casesCompletes, corrigerCases, casesVides, champsDepuis, CHAMPS_VIDES, ordreChamps, reponseDepuis } from "@/lib/game/saisie";

describe("saisie par trois cases", () => {
  it("n'affiche que les cases utiles à la précision", () => {
    expect(ordreChamps("annee")).toEqual(["annee"]);
    expect(ordreChamps("mois")).toEqual(["mois", "annee"]);
    expect(ordreChamps("jour")).toEqual(["jour", "mois", "annee"]);
  });

  it("lit une année, un mois et un jour", () => {
    expect(reponseDepuis({ jour: "14", mois: "07", annee: "1789" }, "jour")).toEqual({ year: 1789, month: 7, day: 14 });
    expect(reponseDepuis({ jour: "", mois: "11", annee: "1918" }, "mois")).toEqual({ year: 1918, month: 11 });
    expect(reponseDepuis({ jour: "", mois: "", annee: "1918" }, "annee")).toEqual({ year: 1918 });
  });

  it("ignore les cases en trop selon la précision", () => {
    expect(reponseDepuis({ jour: "14", mois: "07", annee: "1789" }, "annee")).toEqual({ year: 1789 });
    expect(reponseDepuis({ jour: "14", mois: "07", annee: "1789" }, "mois")).toEqual({ year: 1789, month: 7 });
  });

  it("comprend le « - » devant l'année comme av. J.-C.", () => {
    expect(reponseDepuis({ jour: "", mois: "", annee: "-44" }, "annee")).toEqual({ year: -44 });
  });

  it("n'a pas de date tant que l'année manque", () => {
    expect(reponseDepuis({ jour: "14", mois: "07", annee: "" }, "jour")).toBeNull();
    expect(reponseDepuis({ jour: "", mois: "", annee: "-" }, "annee")).toBeNull();
  });

  it("ramène un mois ou un jour impossible dans le calendrier", () => {
    expect(reponseDepuis({ jour: "", mois: "15", annee: "1918" }, "mois")).toEqual({ year: 1918, month: 12 });
    expect(reponseDepuis({ jour: "31", mois: "02", annee: "1900" }, "jour")).toEqual({ year: 1900, month: 2, day: 28 });
    expect(reponseDepuis({ jour: "29", mois: "02", annee: "2000" }, "jour")).toEqual({ year: 2000, month: 2, day: 29 });
  });

  it("recopie une date de la frise dans les cases, et inversement", () => {
    const d = { year: -44, month: 3, day: 15 };
    const c = champsDepuis(d);
    expect(c).toEqual({ jour: "15", mois: "03", annee: "-44" });
    expect(reponseDepuis(c, "jour")).toEqual(d);
    expect(champsDepuis({ year: 1918 })).toEqual({ jour: "", mois: "", annee: "1918" });
  });

  it("sait si les cases sont vides ou complètes", () => {
    expect(casesVides(CHAMPS_VIDES, "jour")).toBe(true);
    expect(casesVides({ jour: "", mois: "", annee: "-" }, "annee")).toBe(false);
    expect(casesCompletes({ jour: "14", mois: "", annee: "1789" }, "jour")).toBe(false);
    expect(casesCompletes({ jour: "14", mois: "07", annee: "1789" }, "jour")).toBe(true);
    expect(casesCompletes({ jour: "", mois: "", annee: "1789" }, "annee")).toBe(true);
  });

  it("corrige dans les cases un mois ou un jour impossible", () => {
    expect(corrigerCases({ jour: "", mois: "13", annee: "" })).toEqual({ jour: "", mois: "12", annee: "" });
    expect(corrigerCases({ jour: "32", mois: "", annee: "" })).toEqual({ jour: "31", mois: "", annee: "" });
    expect(corrigerCases({ jour: "31", mois: "04", annee: "" })).toEqual({ jour: "30", mois: "04", annee: "" });
    expect(corrigerCases({ jour: "31", mois: "02", annee: "1900" })).toEqual({ jour: "28", mois: "02", annee: "1900" });
    expect(corrigerCases({ jour: "30", mois: "02", annee: "" }).jour).toBe("29");
    expect(corrigerCases({ jour: "29", mois: "02", annee: "1900" }).jour).toBe("28");
  });

  it("laisse intactes les saisies encore possibles", () => {
    expect(corrigerCases({ jour: "3", mois: "1", annee: "" })).toEqual({ jour: "3", mois: "1", annee: "" });
    expect(corrigerCases({ jour: "29", mois: "02", annee: "2000" }).jour).toBe("29");
  });
});
