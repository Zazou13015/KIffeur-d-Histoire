import { expect, test } from "@playwright/test";
import { lireSql } from "./local";
import { attendreQuestion, idPartie, lireBilan, questionsEnBase, repondreAuClavier, validerEtContinuer } from "./outils";

test("solo scolaire sur un seul chapitre : toutes les questions viennent de ce chapitre", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Solo scolaire/ }).click();
  await expect(page).toHaveURL(/\/scolaire$/);

  // Premier niveau proposé, puis un seul chapitre coché : le premier qui a assez de questions.
  await page.getByRole("button", { pressed: false }).filter({ hasText: /chapitres$/ }).first().click();
  await page.getByRole("button", { name: "Tout décocher" }).click();
  const jouer = page.getByRole("button", { name: "Jouer" });
  await expect(jouer).toBeDisabled();
  const chapitres = page.getByRole("checkbox");
  let titre: string | null = null;
  for (let i = 0; i < (await chapitres.count()); i++) {
    await chapitres.nth(i).check({ force: true });
    if (await jouer.isEnabled()) {
      titre = (await chapitres.nth(i).locator("xpath=..").locator("b").textContent())!.trim();
      break;
    }
    await chapitres.nth(i).uncheck({ force: true });
  }
  expect(titre, "aucun chapitre jouable seul").not.toBeNull();
  await expect(page.getByText(/1 chapitre\b/)).toBeVisible();
  await jouer.click();
  await expect(page).toHaveURL(/\/partie\//);
  const gameId = idPartie(page);

  const total = await attendreQuestion(page, 1);
  for (let n = 1; n <= total; n++) {
    await attendreQuestion(page, n);
    await repondreAuClavier(page, 1900);
    await validerEtContinuer(page);
  }
  await lireBilan(page);

  // Chaque événement tiré appartient au chapitre choisi.
  const questions = questionsEnBase(gameId);
  expect(questions).toHaveLength(total);
  const ids = questions.map((q) => `'${q.event_id.replace(/'/g, "")}'`).join(",");
  const communs = lireSql<{ title: string }[]>(
    `select c.title from histoire.chapters c
     where (select count(distinct ec.event_id) from histoire.event_chapters ec where ec.chapter_id = c.id and ec.event_id in (${ids})) = ${total}`,
  );
  expect(communs.map((c) => c.title)).toContain(titre);
});
