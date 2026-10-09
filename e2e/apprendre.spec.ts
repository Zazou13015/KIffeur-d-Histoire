import { expect, test } from "@playwright/test";
import { attendreQuestion, lireBilan, repondreAuClavier, validerEtContinuer } from "./outils";

test("apprendre : découvrir un chapitre puis se tester dessus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Apprendre/ }).click();
  await expect(page).toHaveURL(/\/apprendre$/);

  // Premier niveau, premier chapitre.
  const niveau = page.getByLabel("1. Choisir mon niveau");
  await niveau.selectOption({ index: 0 });
  const nomNiveau = (await niveau.locator("option:checked").textContent())!.trim();
  const lien = page.getByRole("region", { name: `Chapitres ${nomNiveau}` }).getByRole("link").first();
  const titre = (await lien.locator("span.text-lg").textContent())!.trim();
  await lien.click();
  await expect(page.getByRole("heading", { level: 1, name: titre })).toBeVisible();

  // Découvrir : ouvrir une carte du chapitre.
  const cartes = page.getByRole("navigation", { name: "Cartes du chapitre" }).getByRole("button");
  expect(await cartes.count()).toBeGreaterThanOrEqual(5);
  await cartes.first().click();
  await expect(page.locator("#titre-carte")).toBeVisible();

  // Se tester : une partie sur les cartes du chapitre.
  await page.getByRole("button", { name: "Me tester sur ce chapitre" }).click();
  await expect(page).toHaveURL(/\/partie\//);
  const total = await attendreQuestion(page, 1);
  expect(total).toBeGreaterThanOrEqual(5);
  for (let n = 1; n <= total; n++) {
    await attendreQuestion(page, n);
    await repondreAuClavier(page, 1850);
    await validerEtContinuer(page);
  }
  const { bilan } = await lireBilan(page);
  await expect(bilan.getByText(`Test du chapitre · ${titre}`)).toBeVisible();

  // Sans compte, la progression reste dans l'onglet : le chapitre apparaît découvert et testé.
  await page.goto("/apprendre");
  const carteChapitre = page.getByRole("link", { name: new RegExp(titre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  await expect(carteChapitre.getByText("Découvert")).toBeVisible();
  await expect(carteChapitre.getByText(/Meilleur test/)).toBeVisible();
});
