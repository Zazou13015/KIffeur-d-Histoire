import { describe, expect, it } from "vitest";
import { lireDate } from "@/lib/game/saisie";

const ok = (texte: string, precision: "annee" | "mois" | "jour", date: object) =>
  expect(lireDate(texte, precision)).toEqual({ ok: true, date });
const erreur = (texte: string, precision: "annee" | "mois" | "jour") => {
  const r = lireDate(texte, precision);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.erreur;
};

describe("lecture d'une date tapée", () => {
  it("lit une année seule", () => {
    ok("1918", "annee", { year: 1918 });
    ok("  476 ", "annee", { year: 476 });
  });

  it("lit les dates av. J.-C. écrites de plusieurs façons", () => {
    ok("-44", "annee", { year: -44 });
    ok("−44", "annee", { year: -44 });
    ok("44 av. J.-C.", "annee", { year: -44 });
    ok("44 av JC", "annee", { year: -44 });
    ok("44 avant J.-C.", "annee", { year: -44 });
    ok("44 BC", "annee", { year: -44 });
    ok("753 av. J.-C.", "annee", { year: -753 });
  });

  it("accepte ap. J.-C. et l'ignore", () => {
    ok("800 ap. J.-C.", "annee", { year: 800 });
    ok("800 AD", "annee", { year: 800 });
  });

  it("lit mois et année", () => {
    ok("11/1918", "mois", { year: 1918, month: 11 });
    ok("11 1918", "mois", { year: 1918, month: 11 });
    ok("11-1918", "mois", { year: 1918, month: 11 });
    ok("novembre 1918", "mois", { year: 1918, month: 11 });
    ok("Août 843", "mois", { year: 843, month: 8 });
    ok("aout 843", "mois", { year: 843, month: 8 });
    ok("sept. 1789", "mois", { year: 1789, month: 9 });
    ok("3/-44", "mois", { year: -44, month: 3 });
  });

  it("lit jour, mois et année", () => {
    ok("11/11/1918", "jour", { year: 1918, month: 11, day: 11 });
    ok("11 novembre 1918", "jour", { year: 1918, month: 11, day: 11 });
    ok("14 juil. 1789", "jour", { year: 1789, month: 7, day: 14 });
    ok("1er mai 1900", "jour", { year: 1900, month: 5, day: 1 });
    ok("21 avril 753 av. J.-C.", "jour", { year: -753, month: 4, day: 21 });
    ok("25-12-800", "jour", { year: 800, month: 12, day: 25 });
  });

  it("ne garde que la précision demandée", () => {
    ok("14 juillet 1789", "annee", { year: 1789 });
    ok("14 juillet 1789", "mois", { year: 1789, month: 7 });
  });

  it("explique ce qui manque quand la précision n'est pas atteinte", () => {
    expect(erreur("1918", "mois")).toMatch(/mois/);
    expect(erreur("11/1918", "jour")).toMatch(/jour/);
    expect(erreur("novembre 1918", "jour")).toMatch(/jour/);
  });

  it("refuse les saisies invalides", () => {
    erreur("", "annee");
    erreur("   ", "annee");
    erreur("abc", "annee");
    erreur("1918 pizza", "annee");
    erreur("12/12/12/12", "jour");
    expect(erreur("0", "annee")).toMatch(/année 0/);
    expect(erreur("13/1918", "mois")).toMatch(/mois/);
    expect(erreur("0/1918", "mois")).toMatch(/mois/);
    expect(erreur("31/04/1918", "jour")).toMatch(/jours/);
    expect(erreur("30/02/1918", "jour")).toMatch(/jours/);
    expect(erreur("5000", "annee")).toMatch(/frise/);
    expect(erreur("4000 av. J.-C.", "annee")).toMatch(/frise/);
    expect(erreur("2030", "annee")).toMatch(/frise/);
    expect(erreur("-44 ap. J.-C.", "annee")).toMatch(/contredisent/);
  });

  it("accepte le 29 février d'une année bissextile seulement", () => {
    ok("29/02/1904", "jour", { year: 1904, month: 2, day: 29 });
    erreur("29/02/1900", "jour");
  });

  it("repère un mois ambigu ou inconnu", () => {
    expect(erreur("jui 1789", "mois")).toMatch(/deux mois/);
    expect(erreur("foo 1789", "mois")).toMatch(/Je ne connais pas/);
    ok("juin 1789", "mois", { year: 1789, month: 6 });
    ok("juil 1789", "mois", { year: 1789, month: 7 });
  });
});
