import { expect, test } from "@playwright/test";
import { lireSql } from "./local";
import { attendreQuestion, idPartie, lireBilan, questionsEnBase, repondreAuClavier, validerEtContinuer } from "./outils";

test("solo scolaire sur un seul chapitre : toutes les questions viennent de ce chapitre", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Solo scolaire/ }).click();
  await expect(page).toHaveURL(/\/scolaire$/);

  // Premier niveau proposé, puis un seul chapitre coché : le premier qui a assez de questions.
  const niveau = page.getByRole("button", { pressed: false }).filter({ hasText: /chapitres$/ }).first();
  const nomNiveau = (await niveau.locator("b").textContent())!.trim();
  // Lire les vrais candidats dans la pile locale : ne pas confondre absence de données et attente RPC.
  const disponibles = lireSql<{ id: string; title: string; jouables: number }[]>(
    `select c.id, c.title, (select count(*)::int from histoire.solo_candidates(
       null,null,null,null,null,null,array[c.id],'YEAR')) as jouables
     from histoire.chapters c join histoire.levels l on l.id=c.level_id
     where l.name='${nomNiveau.replace(/'/g, "''")}'`,
  );
  expect(disponibles.some((c) => c.jouables >= 10), "le dataset E2E doit contenir un chapitre jouable seul").toBe(true);
  await niveau.click();
  await page.getByRole("button", { name: "Tout décocher" }).click();
  const jouer = page.getByRole("button", { name: "Jouer" });
  await expect(jouer).toBeDisabled();
  const chapitres = page.getByRole("checkbox");
  const disponibilite = page.locator("form").getByRole("status");
  let titre: string | null = null;
  let chapitreId: string | null = null;
  for (let i = 0; i < (await chapitres.count()); i++) {
    const candidat = (await chapitres.nth(i).locator("xpath=..").locator("b").textContent())!.trim();
    const chapitre = disponibles.find((c) => c.title === candidat);
    expect(chapitre, `chapitre ${candidat} présent en base locale`).toBeDefined();
    await chapitres.nth(i).check({ force: true });
    // Le texte résolu remplace l'état provisoire ; aucun délai arbitraire.
    const n = chapitre!.jouables;
    await expect(disponibilite).toHaveText(`${n} question${n > 1 ? "s" : ""} réellement jouable${n > 1 ? "s" : ""}.`);
    if (n >= 10) {
      await expect(jouer).toBeEnabled();
      titre = candidat;
      chapitreId = chapitre!.id;
      break;
    }
    await expect(jouer).toBeDisabled();
    await chapitres.nth(i).uncheck({ force: true });
  }
  expect(titre, "aucun chapitre jouable seul").not.toBeNull();
  await expect(page.getByText(/1 chapitre\b/)).toBeVisible();
  await jouer.click();
  await expect(page).toHaveURL(/\/partie\//);
  const gameId = idPartie(page);

  const total = await attendreQuestion(page, 1);
  expect(total).toBe(10);
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
  const communs = lireSql<{ id: string; title: string }[]>(
    `select c.id, c.title from histoire.chapters c
     where (select count(distinct ec.event_id) from histoire.event_chapters ec where ec.chapter_id = c.id and ec.event_id in (${ids})) = ${total}`,
  );
  expect(communs.map((c) => c.title)).toContain(titre);
  expect(communs.map((c) => c.id)).toContain(chapitreId);
});
