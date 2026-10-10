import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium }=createRequire(import.meta.url)('@playwright/test');
const dir=new URL('./',import.meta.url);
await mkdir(new URL('captures/',dir),{recursive:true});
const browser=await chromium.launch({headless:true});
const mesures=[], erreurs=[], requetesDistantes=[];
try {
  for (const viewport of [{width:1366,height:768},{width:1024,height:768},{width:736,height:900},{width:390,height:844},{width:375,height:667},{width:320,height:568}]) {
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    page.on('pageerror',error=>erreurs.push(error.message));
    page.on('request',request=>{if (/^https?:/.test(request.url())) requetesDistantes.push(request.url());});
    await page.goto(new URL('cabinet-plus.html',dir).href);
    await page.evaluate(()=>document.fonts.ready);
    async function mesurer(cas) {
      const mesure=await page.evaluate(()=> {
        const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {top:r.top+scrollY,bottom:r.bottom+scrollY,left:r.left,right:r.right};};
        return {largeur:innerWidth,hauteur:innerHeight,largeurDocument:document.documentElement.scrollWidth,hauteurDocument:document.documentElement.scrollHeight,score:rect('[data-score]'),rejouer:rect('[data-action="rejouer"]'),changer:rect('[data-action="mode"]'),maximum:rect('.score-base'),ornement:rect('.score-ornament'),fond:getComputedStyle(document.getElementById('bilan-cabinet-plus')).backgroundColor};
      });
      mesures.push({cas,...mesure});
      assert.ok(mesure.largeurDocument<=viewport.width,`${viewport.width} ${cas}: débordement horizontal`);
      assert.ok(mesure.score.bottom<=viewport.height,`${viewport.width} ${cas}: score sous la ligne de flottaison`);
      assert.ok(mesure.rejouer.bottom<=viewport.height,`${viewport.width} ${cas}: Rejouer sous la ligne de flottaison`);
      assert.ok(mesure.changer.bottom<=viewport.height,`${viewport.width} ${cas}: Changer de mode sous la ligne de flottaison`);
      if (viewport.width>=1024) assert.ok(mesure.hauteurDocument<=viewport.height,`${viewport.width} ${cas}: écran desktop trop haut (${mesure.hauteurDocument})`);
      assert.equal(mesure.fond,'rgb(243, 242, 236)','Fond papier existant');
      assert.ok(mesure.ornement.top>=mesure.maximum.bottom,`${viewport.width} ${cas}: ornement sur le score maximal`);
    }
    await mesurer('classique');
    assert.equal(await page.locator('[data-score]').innerText(),'726');
    assert.equal(await page.locator('[data-accuracy]').innerText(),'82%');
    assert.equal(await page.locator('[data-exact-count]').innerText(),'3');
    assert.equal(await page.locator('.correct-mark').count(),10);
    assert.equal(await page.locator('.player-mark').count(),9);
    assert.equal(await page.locator('[data-picks] button').count(),10);
    // Les regroupements sont navigables ; toutes les dix questions restent accessibles.
    const nombreGroupes=await page.locator('[data-group]').count();
    assert.ok(nombreGroupes>=2 && nombreGroupes<10);
    const groupe=page.locator('[data-group]').filter({hasText:/repères/}).first();
    const indices=(await groupe.getAttribute('data-group')).split(',').map(Number);
    for (let tour=0;tour<indices.length;tour++) {
      await page.locator(`[data-group="${indices.join(',')}"]`).click();
      const courant=await page.locator('[data-picks] [aria-pressed="true"]').getAttribute('data-question');
      assert.ok(indices.includes(Number(courant)));
    }
    await page.locator('[data-question="2"]').click();
    await page.locator('[data-view="ecart"]').click();
    assert.equal(await page.locator('.correct-mark').count(),1);
    assert.equal(await page.locator('.player-mark').count(),1);
    assert.match(await page.locator('[data-frise-caption]').innerText(),/2 ans/);
    assert.match(await page.locator('[data-timeline]').innerText(),/52 av\. J\.-C\./);
    assert.match(await page.locator('[data-timeline]').innerText(),/50 av\. J\.-C\./);
    await mesurer('vue ecart');
    if (viewport.width===1366) {
      await page.mouse.move(0,0); await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:fileURLToPath(new URL('captures/cabinet-plus-ecart-1366.png',dir))});
    }
    await page.locator('[data-question="9"]').click();
    assert.match(await page.locator('[data-detail]').innerText(),/Temps écoulé · aucune réponse/);
    assert.equal(await page.locator('[data-view="ecart"]').isDisabled(),true);
    await mesurer('expiration');
    await page.locator('[data-action="meilleure"]').click();
    assert.match(await page.locator('[data-detail]').innerText(),/Chute du mur de Berlin/);
    await page.locator('[data-view="ecart"]').click();
    assert.match(await page.locator('[data-frise-caption]').innerText(),/date exacte/);
    await page.locator('[data-action="precedente"]').click();
    assert.match(await page.locator('[data-detail]').innerText(),/Charlemagne/);
    await page.locator('[data-action="suivante"]').click();
    assert.match(await page.locator('[data-detail]').innerText(),/Chute du mur de Berlin/);
    await page.locator('[data-action="rejouer"]').click();
    assert.match(await page.locator('[data-notice]').innerText(),/même choix/);
    await page.locator('[data-action="mode"]').click();
    assert.match(await page.locator('[data-notice]').innerText(),/choix du mode/);
    const scenario=page.locator('[data-scenario]');
    for (const cas of ['inverse','zero','pedagogique','invite','rattachement','erreur']) {
      await scenario.selectOption(cas); await mesurer(cas);
      switch(cas) {
        case 'inverse':
          assert.equal(await page.locator('[data-score]').innerText(),'579');
          assert.equal(await page.locator('[data-accuracy]').innerText(),'70%');
          assert.equal(await page.locator('[data-exact-count]').innerText(),'7');
          assert.equal(await page.locator('.player-mark').count(),0);
          assert.equal(await page.locator('[data-view="ecart"]').isDisabled(),true);
          assert.match(await page.locator('[data-detail]').innerText(),/Bataille de Gergovie/); break;
        case 'zero':
          assert.equal(await page.locator('[data-score]').innerText(),'0');
          assert.equal(await page.locator('[data-accuracy]').innerText(),'0%');
          assert.equal(await page.locator('[data-action="meilleure"]').isVisible(),false); break;
        case 'pedagogique':
          assert.equal(await page.locator('[data-action="chapitre"]').isVisible(),true);
          assert.equal(await page.locator('[data-chapter-status]').isVisible(),true);
          await page.locator('[data-action="chapitre"]').click();
          assert.match(await page.locator('[data-notice]').innerText(),/frise du chapitre/); break;
        case 'invite':
          await page.locator('[data-action="connexion"]').click();
          assert.match(await page.locator('[data-notice]').innerText(),/Aucun accès à l’authentification/); break;
        case 'rattachement': assert.match(await page.locator('[data-save]').innerText(),/en cours/); break;
        case 'erreur':
          assert.equal(await page.locator('[data-save]').getAttribute('role'),'alert');
          await page.locator('[data-action="reessayer"]').click();
          assert.match(await page.locator('[data-notice]').innerText(),/Aucune requête/); break;
      }
    }
    await scenario.selectOption('classique');
    await page.evaluate(()=>scrollTo(0,0)); await page.mouse.move(0,0);
    if (viewport.width===1366 || viewport.width===390) {
      await page.screenshot({path:fileURLToPath(new URL(`captures/cabinet-plus-${viewport.width}.png`,dir))});
      if (viewport.width===390) await page.screenshot({path:fileURLToPath(new URL('captures/cabinet-plus-mobile-complet.png',dir)),fullPage:true});
    }
    console.log(`A+ ${viewport.width}×${viewport.height} : 7 cas, visibilité, parcours, écart et navigation — OK`);
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'no-preference'});
  page.on('pageerror',error=>erreurs.push(error.message));
  await page.goto(new URL('cabinet-plus.html',dir).href);
  await page.waitForFunction(()=>document.querySelector('[data-score]').textContent==='726');
  await page.close();
  assert.deepEqual(erreurs,[]);
  assert.deepEqual(requetesDistantes,[]);
} finally {
  await browser.close();
  await writeFile(new URL('captures/mesures-cabinet-plus.json',dir),JSON.stringify({mesures,erreurs,requetesDistantes},null,2)+'\n');
}
