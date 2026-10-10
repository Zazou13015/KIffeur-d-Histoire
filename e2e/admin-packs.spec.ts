import { expect, test } from "@playwright/test";
import { COMPTE_TEST, executerSql, lireSql } from "./local";

// Une interaction bloquée doit échouer à sa ligne, sans attendre le timeout du job.
test.use({ actionTimeout: 15_000 });

// Le compte existe déjà dans la pile locale : aucun compte Auth supplémentaire.
test.beforeEach(() => {
  executerSql(`
    delete from histoire.admins where user_id=(select id from auth.users where email='${COMPTE_TEST.email}');
    delete from histoire.pack_event_status where pack_id='E2E87';
    delete from histoire.pack_event_audit where pack_id='E2E87';
    delete from histoire.event_editorial_audit where event_id='EVT-87999';
    delete from histoire.event_editorial_overrides where event_id='EVT-87999';
    insert into histoire.packs(id,slug,title) values ('E2E87','e2e87','Pack relecture E2E87') on conflict do nothing;
    insert into histoire.events(id,title,event_type,precision,date_status,playable,playable_mode,importance,difficulty,niveau)
      values ('EVT-87999','Question relecture E2E87','POINT','DAY','EXACT',true,'DAY',1,1,2)
      on conflict (id) do update set title=excluded.title,niveau=excluded.niveau;
    insert into histoire.event_answers(event_id,start_year,start_month,start_day)
      values ('EVT-87999',9876,1,2) on conflict do nothing;
    insert into histoire.pack_events(pack_id,event_id,position) values ('E2E87','EVT-87999',1) on conflict do nothing;
    insert into histoire.packs(id,slug,title) values ('E2E104','e2e104','Second pack E2E104') on conflict do nothing;
    insert into histoire.pack_events(pack_id,event_id,position) values ('E2E104','EVT-87999',1) on conflict do nothing;
  `);
});
test.afterEach(() => {
  executerSql(`
    delete from histoire.admins where user_id=(select id from auth.users where email='${COMPTE_TEST.email}');
    delete from histoire.pack_event_status where pack_id='E2E87';
    delete from histoire.pack_event_audit where pack_id='E2E87';
    delete from histoire.event_editorial_audit where event_id='EVT-87999';
    delete from histoire.event_editorial_overrides where event_id='EVT-87999';
    delete from histoire.pack_events where pack_id in ('E2E87','E2E104');
    delete from histoire.packs where id in ('E2E87','E2E104');
    delete from histoire.events where id='EVT-87999';
  `);
});
async function connecter(page: import("@playwright/test").Page) {
  await page.goto("/connexion");
  await page.getByPlaceholder("Email").fill(COMPTE_TEST.email);
  await page.getByPlaceholder("Mot de passe").fill(COMPTE_TEST.motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(COMPTE_TEST.pseudo).first()).toBeVisible();
}
function autoriser() {
  executerSql(`insert into histoire.admins(user_id,note) select id,'Fixture locale #87'
    from histoire.players where id=(select id from auth.users where email='${COMPTE_TEST.email}');`);
}

test("anonyme redirigé et joueur refusé sans date de réponse", async ({ page }) => {
  await page.goto("/admin/packs?pack=E2E87");
  await expect(page).toHaveURL(/\/connexion/);
  await connecter(page);
  const response = await page.goto("/admin/packs?pack=E2E87");
  await expect(page.getByRole("heading", { name: "Relire les packs" })).toHaveCount(0);
  const html = await response!.text();
  expect(html).not.toContain("Question relecture E2E87");
  expect(html).not.toContain('"start_year":9876');
});

test("admin : lien depuis les indicateurs, retrait, audit, refresh et réintégration", async ({ page }) => {
  await connecter(page); autoriser();
  await page.goto("/admin/indicateurs");
  await page.getByRole("link", { name: "Relire les packs et gérer les questions" }).click();
  await page.getByRole("navigation", { name: "Packs" }).getByRole("link", { name: /Pack relecture E2E87/ }).click();
  const row = page.getByRole("row", { name: /Question relecture E2E87/ });
  await expect(row).toContainText("2 janvier 9876");
  await page.getByRole("combobox", { name: "Niveau", exact: true }).selectOption("2");
  await page.getByLabel("Rechercher par titre").fill("relecture");
  await row.getByRole("button", { name: "Retirer" }).click();
  const dialog = page.getByRole("dialog", { name: "Retirer cette question du pack ?" });
  await dialog.getByLabel("Motif facultatif").fill("Hors thème, relecture humaine");
  await dialog.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Retirée");
  await expect(page.getByRole("status")).toContainText("question retirée");
  expect(lireSql<{ n: number }[]>("select count(*)::integer n from histoire.pack_event_audit where pack_id='E2E87'")[0].n).toBe(1);
  await page.reload();
  await expect(row).toContainText("Retirée");
  await row.getByText("Dernière modification").click();
  await expect(row).toContainText("Hors thème, relecture humaine");
  await row.getByRole("button", { name: "Remettre" }).click();
  await expect(row).toContainText("Jouable");
  expect(lireSql<{ operations: string[] }[]>("select array_agg(operation order by id) operations from histoire.pack_event_audit where pack_id='E2E87'")[0].operations)
    .toEqual(["retirer", "remettre"]);
  await row.getByRole("button", { name: "Retirer" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("une coupure réseau laisse la question et le motif disponibles pour réessayer", async ({ page }) => {
  await connecter(page); autoriser();
  await page.goto("/admin/packs?pack=E2E87");
  await page.getByRole("button", { name: "Retirer", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif facultatif").fill("À relire");
  await page.route("**/admin/packs**", (route) => route.request().method() === "POST" ? route.abort() : route.continue());
  await dialog.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(dialog.getByRole("alert")).toContainText("connexion");
  await expect(dialog.getByLabel("Motif facultatif")).toHaveValue("À relire");
  await page.unroute("**/admin/packs**");
  await dialog.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("row", { name: /Question relecture E2E87/ })).toContainText("Retirée");
});

test("édition globale : annuler, titre/niveau/motif, audit, autre pack et rechargement", async ({ page }) => {
  await connecter(page); autoriser();
  await page.goto("/admin/packs?pack=E2E87");
  const row = page.getByRole("row", { name: /EVT-87999/ });
  await row.getByRole("button", { name: "Modifier", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Modifier la question" });
  await expect(dialog.getByLabel("Titre de la question")).toHaveValue("Question relecture E2E87");
  await expect(dialog.getByRole("combobox", { name: "Niveau de la question" })).toHaveValue("2");
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row.getByRole("button", { name: "Modifier", exact: true })).toBeFocused();
  await row.getByRole("button", { name: "Modifier", exact: true }).click();
  await dialog.getByLabel("Titre de la question").fill("Titre corrigé E2E104");
  await dialog.getByRole("combobox", { name: "Niveau de la question" }).selectOption("3");
  await dialog.getByLabel("Motif de modification facultatif").fill("Correction humaine du libellé");
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Titre corrigé E2E104"); await expect(row).toContainText("Expert");
  await expect(page.getByRole("status")).toContainText("tous les packs");
  await row.getByRole("button", { name: "Historique", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Historique des corrections" });
  await expect(history.getByRole("listitem")).toHaveCount(1);
  await expect(history).toContainText("Question relecture E2E87");
  await expect(history).toContainText("Correction humaine du libellé");
  await expect(history).toContainText("Intermédiaire → Expert");
  await page.keyboard.press("Escape"); await expect(history).not.toBeVisible();
  await page.getByRole("navigation", { name: "Packs" }).getByRole("link", { name: /Second pack E2E104/ }).click();
  await expect(row).toContainText("Titre corrigé E2E104"); await page.reload();
  await expect(row).toContainText("Expert");
  // Enregistrer sans changement confirme l'état sans nouvelle entrée d'audit.
  await row.getByRole("button", { name: "Modifier", exact: true }).click();
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect(page.getByRole("status")).toContainText("Aucun changement");
  expect(lireSql<{ n: number }[]>("select count(*)::integer n from histoire.event_editorial_audit where event_id='EVT-87999'")[0].n).toBe(1);
});

test("édition : erreur réseau garde la saisie et autorise une reprise", async ({ page }) => {
  await connecter(page); autoriser(); await page.goto("/admin/packs?pack=E2E87");
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Modifier la question" });
  await dialog.getByLabel("Titre de la question").fill("Titre repris E2E104");
  await dialog.getByLabel("Motif de modification facultatif").fill("À conserver");
  await page.route("**/admin/packs**", (route) => route.request().method() === "POST" ? route.abort() : route.continue());
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("connexion");
  await expect(dialog.getByLabel("Titre de la question")).toHaveValue("Titre repris E2E104");
  await expect(dialog.getByLabel("Motif de modification facultatif")).toHaveValue("À conserver");
  await page.unroute("**/admin/packs**");
  await dialog.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("row", { name: /EVT-87999/ })).toContainText("Titre repris E2E104");
});
