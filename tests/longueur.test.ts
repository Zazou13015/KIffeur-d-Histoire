import { expect, it } from "vitest";
import { ecrireChoix, filtresDepuis, lireChoix, nombreQuestions, relanceEnregistree, type Longueur } from "@/lib/solo/choix";

it.each([5, 10, 20, "tout"] as Longueur[])("fait voyager %s dans les filtres et le choix de relance", (longueur) => {
  for (const mode of ["general", "scolaire"] as const) {
    for (const inverse of [false, true]) {
      const choix = { mode, difficulte: inverse ? "DAY" as const : "YEAR" as const, longueur,
        ...(mode === "scolaire" ? { chapitres: ["THM-001", "THM-002"] } : { niveau: 2 as const }),
        ...(inverse ? { sens: "inverse" as const } : {}) };
      expect(lireChoix(new URLSearchParams(ecrireChoix(choix)))).toEqual(choix);
      expect(filtresDepuis(choix).questionCount).toBe(longueur === "tout" ? 0 : longueur);
    }
  }
});
it("conserve dix questions pour les liens historiques et refuse une longueur inventée", () => {
  const ancien = lireChoix(new URLSearchParams("mode=general&difficulte=YEAR"))!;
  expect(filtresDepuis(ancien).questionCount).toBe(10);
  for (const l of ["0", "100", "-1", "5.5", "6", "", "ALL"]) {
    expect(lireChoix(new URLSearchParams(`mode=general&difficulte=YEAR&longueur=${l}`))).toBeNull();
  }
});
it("Tout accepte une petite sélection, plafonne à 100 et n'invente aucun décompte", () => {
  expect(nombreQuestions("tout", null)).toBeNull();
  expect(nombreQuestions("tout", 0)).toBeNull();
  expect(nombreQuestions("tout", 3)).toBe(3);
  expect(nombreQuestions("tout", 42)).toBe(42);
  expect(nombreQuestions("tout", 130)).toBe(100);
  expect(nombreQuestions(5, 4)).toBeNull();
  expect(nombreQuestions(10, 9)).toBeNull();
  expect(nombreQuestions(20, 19)).toBeNull();
  expect(nombreQuestions(20, 20)).toBe(20);
});
it.each([5, 10, 20, "tout"] as Longueur[])("un test pédagogique ignore la longueur %s et conserve 5 à 10 cartes", (longueur) => {
  const f = filtresDepuis({ mode: "scolaire", chapitres: ["THM-001"], difficulte: "YEAR", test: true, longueur });
  expect(f.chapterTest).toBe(true);
  expect(f.questionCount).toBeGreaterThanOrEqual(5);
  expect(f.questionCount).toBeLessThanOrEqual(10);
});
it("rejoue un bilan du profil avec son niveau, sens, période et longueur enregistrés", () => {
  const texte = relanceEnregistree({ difficulty: "DAY", direction: "inverse", niveau: 3, yearMin: -52, yearMax: 1989, questionCount: 0 })!;
  expect(lireChoix(new URLSearchParams(texte))).toEqual({ mode: "periode", difficulte: "DAY", niveau: 3, sens: "inverse", periode: "libre", de: -52, a: 1989, longueur: "tout" });
  expect(relanceEnregistree(null)).toBeNull();
  const scolaire = relanceEnregistree({ chapterTest: true, difficulty: "YEAR", chapterIds: ["THM-001"] })!;
  expect(lireChoix(new URLSearchParams(scolaire))?.test).toBe(true);
  expect(relanceEnregistree({ difficulty: "YEAR", niveau: 2, questionCount: 20 })).toContain("longueur=20");
});
