import { expect, test } from "@playwright/test";
import { COMPTE_TEST, executerSql } from "./local";
import { attendreQuestion, idPartie, lireBilan, questionsEnBase, repondreAuClavier, validerEtContinuer } from "./outils";

test.beforeEach(() => {
  // Le compte de test repart d'un carnet vide : les chiffres attendus sont connus.
  executerSql(`delete from histoire.games where user_id = (select id from auth.users where email = '${COMPTE_TEST.email}');`);
});

test("connexion puis statistiques : la partie jouée apparaît dans le carnet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await page.getByPlaceholder("Email").fill(COMPTE_TEST.email);
  await page.getByPlaceholder("Mot de passe").fill(COMPTE_TEST.motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(COMPTE_TEST.pseudo).first()).toBeVisible();

  // Une partie connectée, sauvegardée d'office.
  await page.goto("/solo");
  await page.getByRole("button", { name: "Jouer" }).click();
  await expect(page).toHaveURL(/\/partie\//);
  await expect(page.getByText("Tu joues sans compte")).toHaveCount(0);
  const gameId = idPartie(page);
  const total = await attendreQuestion(page, 1);
  for (let n = 1; n <= total; n++) {
    await attendreQuestion(page, n);
    await repondreAuClavier(page, 1700 + n);
    await validerEtContinuer(page);
  }
  const { points } = await lireBilan(page);
  expect(questionsEnBase(gameId).reduce((s, q) => s + (q.points ?? 0), 0)).toBe(points);

  // Le carnet : une partie, et son score comme meilleur score.
  await page.goto("/profil");
  await page.getByRole("link", { name: "Statistiques" }).click();
  await expect(page).toHaveURL(/onglet=statistiques/);
  const valeur = (libelle: string) => page.locator("dt", { hasText: libelle }).first().locator("xpath=following-sibling::dd[1]");
  await expect(valeur("Parties terminées")).toHaveText("1");
  await expect(valeur("Meilleur score")).toHaveText(new RegExp(`^${String(points).replace(/\B(?=(\d{3})+(?!\d))/g, "\\s?")}$`));

  // Le même carnet n'est jamais lisible sans être connecté.
  await page.context().clearCookies();
  await page.goto("/profil?onglet=statistiques");
  await expect(page).toHaveURL(/\/connexion/);
});
