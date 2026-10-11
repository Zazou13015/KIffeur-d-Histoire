import { expect, it } from "vitest";
import { ecrireChoix, filtresDepuis, lireChoix, relanceEnregistree, type Choix } from "@/lib/solo/choix";
import { bandeMystere, choixGagnant, choixMystere, destinationMystere, INDEX_GAGNANT } from "@/lib/solo/mystere";
import type { MysteryTheme } from "@/lib/game/solo";

const gagnant: MysteryTheme = { mode: "pack", id: "PACK-NOUVEAU-95", titre: "Un pack ajouté en base" };
it.each([5, 10, 20, "tout"] as const)("conserve niveau, précision et longueur %s en remplaçant le contenu", (longueur) => {
  const source: Choix = { mode: "periode", periode: "libre", de: 1789, a: 1815, difficulte: "MONTH", niveau: 2, longueur };
  const choix = choixGagnant(source, gagnant);
  expect(choix).toEqual({ mode: "pack", pack: gagnant.id, mystere: true, difficulte: "MONTH", niveau: 2, longueur });
  expect(filtresDepuis(choix)).toEqual({ difficulty: "MONTH", niveau: 2, questionCount: longueur === "tout" ? 0 : longueur,
    packId: gagnant.id, mystery: true });
  expect(lireChoix(new URLSearchParams(ecrireChoix(choix)))).toEqual(choix);
});
it("conserve le sens inverse et impose la date exacte comme le moteur existant", () => {
  const choix = choixGagnant({ mode: "general", sens: "inverse", difficulte: "YEAR", niveau: 3 },
    { mode: "theme", id: "TAG-NOUVEAU-95", titre: "Thème nouveau" });
  expect(choix).toMatchObject({ difficulte: "DAY", sens: "inverse", longueur: 10, theme: "TAG-NOUVEAU-95" });
  expect(filtresDepuis(choix)).toMatchObject({ direction: "inverse", difficulty: "DAY" });
});
it("la bande et la destination contiennent le gagnant fixé, sans nouveau tirage", () => {
  const choix = choixGagnant({ mode: "general", difficulte: "YEAR" }, gagnant);
  expect(bandeMystere([{ mode: "theme", id: "TAG", titre: "Autre" }], gagnant)[INDEX_GAGNANT]).toEqual(gagnant);
  const url = new URL(destinationMystere("jeu-95", 42, choix), "https://test.local");
  expect(url.searchParams.get("n")).toBe("42");
  expect(lireChoix(new URLSearchParams(url.searchParams.get("c")!))).toEqual(choix);
});
it("rouvrir depuis le profil garde le vrai gagnant et relancer enlève son filtre", () => {
  const relance = relanceEnregistree({ mystery: true, mysteryLabel: gagnant.titre, packId: gagnant.id,
    difficulty: "MONTH", niveau: 2, questionCount: 0 });
  const choix = lireChoix(new URLSearchParams(relance!))!;
  expect(choix).toMatchObject({ pack: gagnant.id, mystere: true, longueur: "tout" });
  expect(filtresDepuis(choixMystere(choix))).toEqual({ mystery: true, difficulty: "MONTH", niveau: 2, questionCount: 0 });
});
it("préserve les validations et les liens classiques, scolaires et pédagogiques", () => {
  expect(lireChoix(new URLSearchParams("mode=pack&pack=../INCONNU&difficulte=YEAR"))).toBeNull();
  expect(lireChoix(new URLSearchParams("mode=pack&pack=bad%2Fid&mystere=1&difficulte=YEAR"))).toBeNull();
  expect(lireChoix(new URLSearchParams("mode=periode&periode=libre&de=1800&mystere=1&difficulte=YEAR"))).toBeNull();
  expect(filtresDepuis(lireChoix(new URLSearchParams("mode=general&difficulte=YEAR"))!))
    .toEqual({ difficulty: "YEAR", questionCount: 10, niveau: 1 });
});
