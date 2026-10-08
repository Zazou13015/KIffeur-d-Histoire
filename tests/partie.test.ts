import { describe, expect, it } from "vitest";
import { capitaliser, chronoDepuis, correctionDepuis, correctionInverseDepuis, dateDepuis, precisionDepuis, urlIllustration } from "@/lib/game/partie";
import type { SoloCorrection } from "@/lib/game/solo";

const base = {
  question_id: "q1",
  correct_date: { year: 1789, month: 7, day: 14 },
  unit: "DAY" as const,
  accuracy: 80,
  points: 72,
  description: "Le peuple de Paris prend la forteresse.",
};

describe("écran de partie : passerelle avec le serveur", () => {
  it("met une majuscule en tête des titres", () => {
    expect(capitaliser("basculement atlantique")).toBe("Basculement atlantique");
    expect(capitaliser("édit de Nantes")).toBe("Édit de Nantes");
    expect(capitaliser("Rome")).toBe("Rome");
    expect(capitaliser("")).toBe("");
  });

  it("convertit la difficulté du serveur en précision de l'écran", () => {
    expect(precisionDepuis("YEAR")).toBe("annee");
    expect(precisionDepuis("MONTH")).toBe("mois");
    expect(precisionDepuis("DAY")).toBe("jour");
  });

  it("garde les composantes absentes à null", () => {
    expect(dateDepuis({ year: 1918 })).toEqual({ year: 1918, month: null, day: null });
  });

  it("écrit l'écart dans l'unité de la difficulté", () => {
    const c: SoloCorrection = { ...base, gap: 3, expired: false };
    expect(correctionDepuis(c)).toMatchObject({ ecart: "3 jours", points: 72, expiree: false, description: base.description });
    expect(correctionDepuis({ ...base, unit: "YEAR", gap: 1, expired: false }).ecart).toBe("1 an");
    expect(correctionDepuis({ ...base, unit: "MONTH", gap: 30, expired: false }).ecart).toBe("3 ans");
  });

  it("une réponse exacte n'a pas d'écart, un temps écoulé non plus", () => {
    expect(correctionDepuis({ ...base, gap: 0, expired: false }).ecart).toBeNull();
    const perdu = correctionDepuis({ ...base, gap: null, points: 0, expired: true });
    expect(perdu).toMatchObject({ ecart: null, points: 0, expiree: true });
  });

  it("n'accepte que les illustrations de la convention <événement>.svg", () => {
    const base = "https://exemple.supabase.co/";
    expect(urlIllustration("EVT-0012.svg", base)).toBe("https://exemple.supabase.co/storage/v1/object/public/histoire-illustrations/EVT-0012.svg");
    expect(urlIllustration("../secret.svg", base)).toBeNull();
    expect(urlIllustration(null, base)).toBeNull();
    expect(urlIllustration("EVT-0012.svg", "")).toBeNull();
  });

  it("recale le chrono sur l'horloge du serveur", () => {
    const q = { asked_at: "2026-10-07T10:00:00Z", deadline: "2026-10-07T10:00:30Z", server_time: "2026-10-07T10:00:02Z" };
    // Le navigateur avance de 5 s sur le serveur : la fin locale avance d'autant.
    const maintenant = Date.parse("2026-10-07T10:00:07Z");
    const c = chronoDepuis(q, maintenant);
    expect(c.totalMs).toBe(30_000);
    expect(c.finMs - maintenant).toBe(28_000);
  });
});

describe("mode inversé : correction affichée", () => {
  const base = { question_id: "q", correct_date: { year: 1947 }, gap: null, unit: "YEAR", accuracy: 100, points: 120, expired: false, description: "début de la guerre froide" } as const;
  it("rend le titre attendu, la bonne date et le verdict", () => {
    const c = correctionInverseDepuis({ ...base, direction: "inverse", title: "la guerre froide", correct: true });
    expect(c).toMatchObject({ correcte: true, titre: "La guerre froide", points: 120, bonne: { year: 1947 }, description: "Début de la guerre froide" });
  });
  it("refuse une correction de jeu de dates", () => {
    expect(() => correctionInverseDepuis({ ...base })).toThrow();
  });
});
