import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const dir = new URL('./', import.meta.url);
await mkdir(new URL('captures/', dir), { recursive: true });
const browser = await chromium.launch({ headless: true });
const mesures = [];
const erreurs = [];
try {
  for (const nom of ['cabinet', 'immersif']) {
    for (const viewport of [
      { width: 1366, height: 768 }, { width: 1024, height: 768 },
      { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 },
    ]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', error => erreurs.push(`${nom}: ${error.message}`));
      await page.goto(new URL(`${nom}.html`, dir).href);
      await page.evaluate(() => document.fonts.ready);
      const mesuresPage = await page.evaluate(() => {
        const rect = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
        };
        return {
          largeur: innerWidth, hauteur: innerHeight,
          largeurDocument: document.documentElement.scrollWidth,
          hauteurDocument: document.documentElement.scrollHeight,
          score: rect('[data-score]'), rejouer: rect('[data-action="rejouer"]'),
          changer: rect('[data-action="mode"]'),
        };
      });
      mesures.push({ proposition: nom, ...mesuresPage });
      assert.ok(mesuresPage.largeurDocument <= viewport.width, `${nom} ${viewport.width}: débordement horizontal`);
      assert.ok(mesuresPage.score.bottom <= viewport.height, `${nom} ${viewport.width}: score sous la ligne de flottaison`);
      assert.ok(mesuresPage.rejouer.bottom <= viewport.height, `${nom} ${viewport.width}: Rejouer sous la ligne de flottaison (${mesuresPage.rejouer.bottom})`);
      if (viewport.width >= 1024) {
        assert.ok(mesuresPage.hauteurDocument <= viewport.height, `${nom} ${viewport.width}: écran desktop trop haut (${mesuresPage.hauteurDocument})`);
        assert.ok(mesuresPage.changer.bottom <= viewport.height);
      }
      await page.getByRole('button', { name: /Question 10 :/ }).click();
      await assert.doesNotReject(() => page.locator('[data-detail]').getByText('Temps écoulé · aucune réponse').waitFor());
      await page.getByRole('button', { name: /Question 3 :/ }).click();
      assert.match(await page.locator('[data-detail]').innerText(), /52 av\. J\.-C\./);
      assert.match(await page.locator('[data-detail]').innerText(), /50 av\. J\.-C\./);
      await page.locator('[data-action="meilleure"]').click();
      assert.match(await page.locator('[data-detail]').innerText(), /Chute du mur de Berlin/);
      await page.locator('[data-action="precedente"]').click();
      assert.match(await page.locator('[data-detail]').innerText(), /Charlemagne/);
      await page.locator('[data-action="suivante"]').click();
      assert.match(await page.locator('[data-detail]').innerText(), /Chute du mur de Berlin/);
      await page.locator('[data-action="rejouer"]').click();
      assert.match(await page.locator('[data-notice]').innerText(), /même choix serait relancé/);
      await page.locator('[data-action="mode"]').click();
      assert.match(await page.locator('[data-notice]').innerText(), /choix du mode/);
      const scenario = page.locator('[data-scenario]');
      async function verifierScenarioVisible(cas) {
        const mesure = await page.evaluate(() => ({
          largeur: document.documentElement.scrollWidth,
          hauteur: document.documentElement.scrollHeight,
          bouton: document.querySelector('[data-action="rejouer"]').getBoundingClientRect().bottom + scrollY,
        }));
        assert.ok(mesure.largeur <= viewport.width, `${nom} ${viewport.width} ${cas}: débordement`);
        assert.ok(mesure.bouton <= viewport.height, `${nom} ${viewport.width} ${cas}: Rejouer sous la ligne de flottaison`);
        if (viewport.width >= 1024) assert.ok(mesure.hauteur <= viewport.height, `${nom} ${viewport.width} ${cas}: écran trop haut (${mesure.hauteur})`);
      }
      await scenario.selectOption('inverse');
      await verifierScenarioVisible('inverse');
      assert.match(await page.locator('[data-detail]').innerText(), /Bataille de Gergovie/);
      assert.equal(await page.locator('[data-accuracy]').innerText(), '70%');
      assert.equal(await page.locator('.player-mark').count(), 0);
      await scenario.selectOption('zero');
      await verifierScenarioVisible('zero');
      assert.equal(await page.locator('[data-score]').innerText(), '0');
      assert.equal(await page.locator('[data-accuracy]').innerText(), '0%');
      assert.equal(await page.locator('[data-action="meilleure"]').isVisible(), false);
      await scenario.selectOption('pedagogique');
      await verifierScenarioVisible('pedagogique');
      assert.equal(await page.locator('[data-action="chapitre"]').isVisible(), true);
      assert.equal(await page.locator('[data-chapter-status]').isVisible(), true);
      await page.locator('[data-action="chapitre"]').click();
      assert.match(await page.locator('[data-notice]').innerText(), /frise du chapitre/);
      await scenario.selectOption('invite');
      await verifierScenarioVisible('invite');
      assert.equal(await page.locator('[data-action="connexion"]').isVisible(), true);
      await page.locator('[data-action="connexion"]').click();
      assert.match(await page.locator('[data-notice]').innerText(), /Aucun accès à l’authentification/);
      await scenario.selectOption('rattachement');
      await verifierScenarioVisible('rattachement');
      assert.match(await page.locator('[data-save]').innerText(), /en cours/);
      await scenario.selectOption('erreur');
      await verifierScenarioVisible('erreur');
      assert.equal(await page.locator('[data-save]').getAttribute('role'), 'alert');
      await page.locator('[data-action="reessayer"]').click();
      assert.match(await page.locator('[data-notice]').innerText(), /Aucune requête envoyée/);
      await scenario.selectOption('classique');
      await page.evaluate(() => scrollTo(0, 0));
      await page.mouse.move(0, 0);
      if (viewport.width === 1366 || viewport.width === 390) {
        await page.screenshot({ path: fileURLToPath(new URL(`captures/${nom}-${viewport.width}.png`, dir)) });
      }
      console.log(`${nom} ${viewport.width}×${viewport.height} : visibilité, navigation et 7 cas — OK`);
      await page.close();
    }
    const animated = await browser.newPage({ viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });
    animated.on('pageerror', error => erreurs.push(error.message));
    await animated.goto(new URL(`${nom}.html`, dir).href);
    await animated.waitForFunction(() => document.querySelector('[data-score]').textContent === '726');
    await animated.close();
  }
  assert.deepEqual(erreurs, [], 'Erreurs JavaScript dans le navigateur');
} finally {
  await browser.close();
  await writeFile(new URL('captures/mesures.json', dir), JSON.stringify({ mesures, erreurs }, null, 2) + '\n');
}
