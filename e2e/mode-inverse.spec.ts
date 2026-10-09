import { expect, test } from "@playwright/test";
import { attendreQuestion, idPartie, lireBilan, questionsEnBase, repondreInverse } from "./outils";

test("mode inversé : la date est donnée, on écrit l'événement, bonne et mauvaise réponses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Mode inversé/ }).click();
  await expect(page).toHaveURL(/\/inverse$/);
  await expect(page.getByText(/date exacte/)).toBeVisible();
  await page.getByRole("button", { name: "Jouer" }).click();
  await expect(page).toHaveURL(/\/partie\//);
  await expect(page.getByRole("region", { name: "Écran de partie, mode inversé" })).toBeVisible();
  const gameId = idPartie(page);

  const total = await attendreQuestion(page, 1);
  expect(total).toBe(10);
  for (let n = 1; n <= total; n++) {
    await attendreQuestion(page, n);
    // Le joueur trouve la première (titre tapé en minuscules, sans accents) et se trompe sur les autres.
    const titre = questionsEnBase(gameId)[n - 1].title;
    const texte = n === 1 ? titre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : "Une réponse qui ne correspond à rien";
    const verdict = await repondreInverse(page, texte);
    expect(verdict).toContain(n === 1 ? "Bonne réponse !" : "Pas tout à fait");
  }

  const { points } = await lireBilan(page);
  const questions = questionsEnBase(gameId);
  expect(questions[0].points).toBeGreaterThan(0);
  expect(questions.slice(1).every((q) => q.points === 0)).toBe(true);
  expect(points).toBe(questions[0].points);
});
