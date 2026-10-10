import { expect, test } from "@playwright/test";
import { lireSql } from "./local";
import { attendreQuestion, idPartie, lireBilan, questionsEnBase, repondreAuClavier, repondreSurFrise, validerEtContinuer } from "./outils";

test("solo libre sans compte : 10 questions, à la frise et au clavier, jusqu'au bilan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kiffeurs d'Histoire" })).toBeVisible();
  await page.getByRole("link", { name: /Solo libre/ }).click();
  await expect(page).toHaveURL(/\/solo$/);
  // Par défaut : niveau Débutant, précision Année.
  await expect(page.getByRole("group", { name: "Niveau" }).getByRole("button", { name: /Débutant/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Précision" }).getByRole("button", { name: /Année/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Jouer" }).click();
  await expect(page).toHaveURL(/\/partie\//);
  await expect(page.getByText("Tu joues sans compte")).toBeVisible();
  const gameId = idPartie(page);

  const total = await attendreQuestion(page, 1);
  expect(total).toBe(10);
  for (let n = 1; n <= total; n++) {
    await attendreQuestion(page, n);
    // Une question sur deux à la frise, l'autre au clavier (validée avec Entrée).
    if (n % 2) {
      await repondreSurFrise(page);
      await validerEtContinuer(page, "bouton");
    } else {
      await repondreAuClavier(page);
      await validerEtContinuer(page, "entree");
    }
  }

  const { bilan, points, precision } = await lireBilan(page);
  await expect(bilan.getByRole("img", { name: `${points} points sur 1000` })).toBeVisible();

  // La base a bien noté les dix réponses, avec la façon de répondre, et le même score que l'écran.
  const questions = questionsEnBase(gameId);
  expect(questions).toHaveLength(10);
  const ids = questions.map((q) => `'${q.event_id.replace(/[^A-Z0-9-]/g, "")}'`).join(",");
  expect(lireSql<{ niveau: number }[]>(`select niveau from histoire.events where id in (${ids})`).every((e) => e.niveau === 1)).toBe(true);
  expect(questions.every((q) => q.answered_at)).toBe(true);
  expect(questions.filter((q) => q.input_method === "frise")).toHaveLength(5);
  expect(questions.filter((q) => q.input_method === "clavier")).toHaveLength(5);
  expect(questions.reduce((s, q) => s + (q.points ?? 0), 0)).toBe(points);
  expect(precision).toBeGreaterThanOrEqual(0);
  expect(precision).toBeLessThanOrEqual(100);
});
