import { expect, test } from "@playwright/test";
import { attendreQuestion, idPartie, lireBilan, repondreAuClavier, validerEtContinuer } from "./outils";
import { lireSql } from "./local";

for (const chemin of ["/solo", "/scolaire", "/inverse", "/inverse?type=scolaire"]) {
  for (const longueur of [5, 10, 20, "tout"] as const) {
    test(`${chemin} : longueur ${longueur}, tirage réel et rechargement sans n`, async ({ page }) => {
      await page.goto(chemin);
      if (chemin.includes("scolaire")) await page.getByRole("button", { name: /^Terminale/ }).click();
      const longueurs = page.getByRole("group", { name: "Longueur de la partie" });
      const bouton = longueurs.getByRole("button", { name: longueur === "tout" ? /^Tout/ : new RegExp(`^${longueur} questions`) });
      // Un programme peut réellement contenir moins de vingt dates exactes.
      // Ce cas doit être désactivé, plutôt que forcer un tirage artificiel.
      await expect(page.getByText(/questions? réellement jouables?/)).toBeVisible();
      if (await bouton.isDisabled()) {
        const n = Number((await page.getByText(/questions? réellement jouables?/).textContent())!.match(/^\d+/)![0]);
        expect(longueur).not.toBe("tout");
        expect(n).toBeLessThan(Number(longueur));
        return;
      }
      await bouton.click();
      const choix = await page.locator('input[name="c"]').inputValue();
      expect(new URLSearchParams(choix).get("longueur")).toBe(String(longueur));
      await page.getByRole("button", { name: "Jouer", exact: true }).click();
      await expect(page).toHaveURL(/\/partie\//);
      const total = await attendreQuestion(page, 1);
      if (longueur !== "tout") expect(total).toBe(longueur);
      else expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
      const id = idPartie(page);
      const stocke = lireSql<{ question_count: number }[]>(`select question_count from histoire.games where id='${id}'`)[0];
      expect(stocke.question_count).toBe(total);
      const url = new URL(page.url()); url.searchParams.delete("n");
      await page.goto(url.toString()); expect(await attendreQuestion(page, 1)).toBe(total);
    });
  }
}
test("une partie courte garde son choix en mémoire et se rejoue depuis A+", async ({ page }) => {
  await page.goto("/solo");
  await page.getByRole("group", { name: "Longueur de la partie" }).getByRole("button", { name: /^5 questions/ }).click();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  for (let n = 1; n <= 5; n++) {
    expect(await attendreQuestion(page, n)).toBe(5);
    await repondreAuClavier(page); await validerEtContinuer(page);
  }
  const { bilan } = await lireBilan(page);
  await expect(bilan.getByRole("img", { name: /points sur 500$/ })).toBeVisible();
  await bilan.getByRole("button", { name: "Rejouer" }).click();
  expect(await attendreQuestion(page, 1)).toBe(5);
  expect(await page.evaluate(() => localStorage.getItem("histoire-choix-solo"))).toContain("longueur=5");
});
