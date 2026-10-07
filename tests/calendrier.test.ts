import { describe, expect, it } from "vitest";
import { annees, decennies, libelleSiecle, libelleTranche, romain, siecles } from "@/lib/game/calendrier";
import { ANNEE_MAX, ANNEE_MIN } from "@/lib/game/saisie";

describe("siècles", () => {
  it("compte les siècles ap. J.-C. de 1 à 2029", () => {
    const s = siecles("ap");
    expect(s[0]).toMatchObject({ numero: 1, debut: 1, fin: 100 });
    expect(s[17]).toMatchObject({ numero: 18, debut: 1701, fin: 1800 });
    expect(s.at(-1)).toMatchObject({ numero: 21, debut: 2001, fin: ANNEE_MAX });
    expect(s).toHaveLength(21);
  });

  it("compte les siècles av. J.-C. du plus ancien au plus récent, sans année 0", () => {
    const s = siecles("av");
    expect(s[0]).toMatchObject({ numero: 35, debut: ANNEE_MIN, fin: -3401 });
    expect(s.at(-1)).toMatchObject({ numero: 1, debut: -100, fin: -1 });
    expect(s).toHaveLength(35);
  });

  it("écrit les siècles en chiffres romains", () => {
    expect(romain(18)).toBe("XVIII");
    expect(romain(19)).toBe("XIX");
    expect(romain(4)).toBe("IV");
    expect(libelleSiecle(siecles("ap")[0])).toBe("Ier siècle");
    expect(libelleSiecle(siecles("ap")[17])).toBe("XVIIIe siècle");
  });
});

describe("décennies et années", () => {
  it("découpe un siècle en dix décennies qui se suivent", () => {
    const d = decennies(siecles("ap")[17]);
    expect(d).toHaveLength(10);
    expect(d[0]).toEqual({ debut: 1701, fin: 1710 });
    expect(d[8]).toEqual({ debut: 1781, fin: 1790 });
    expect(annees(d[8])).toContain(1789);
  });

  it("enjambe l'an 0 sans le produire : 1 av. J.-C. puis 1 ap. J.-C.", () => {
    expect(annees({ debut: -5, fin: 5 })).toEqual([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
    const d = decennies(siecles("av").at(-1)!);
    expect(d.at(-1)).toEqual({ debut: -10, fin: -1 });
    expect(annees(d.at(-1)!)).toEqual([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1]);
    expect(annees(d.at(-1)!)).not.toContain(0);
  });

  it("garde -44 dans la décennie des années 50 à 41 av. J.-C.", () => {
    const d = decennies(siecles("av").at(-1)!);
    const celle = d.find((x) => annees(x).includes(-44))!;
    expect(libelleTranche(celle)).toBe("50–41 av. J.-C.");
  });

  it("coupe la dernière décennie à la fin de la frise", () => {
    const d = decennies(siecles("ap").at(-1)!);
    expect(d.at(-1)).toEqual({ debut: 2021, fin: ANNEE_MAX });
    expect(annees(d.at(-1)!).at(-1)).toBe(ANNEE_MAX);
  });

  it("couvre chaque année de la frise exactement une fois", () => {
    const toutes = (["av", "ap"] as const).flatMap((e) => siecles(e).flatMap((s) => decennies(s).flatMap(annees)));
    expect(new Set(toutes).size).toBe(toutes.length);
    expect(toutes).toHaveLength(-ANNEE_MIN + ANNEE_MAX);
    expect(toutes).not.toContain(0);
    expect(toutes.at(0)).toBe(ANNEE_MIN);
    expect(toutes.at(-1)).toBe(ANNEE_MAX);
  });
});
