// Test d'intégration reproductible, sans lire .env.local ni contacter KFFR.
// Prérequis : npm run db:start puis npm run db:reset.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { chargerCartes, estUrlLocale, importerCartesLocales } from "./import-cartes";
import { lireCsv } from "./csv";

async function verifier() {
  const status = JSON.parse(execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  assert(estUrlLocale(status.API_URL), "URL Supabase non locale : arrêt avant import");
  const env = { ...process.env, SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY };
  const importer = () => execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/import-dataset.ts", "--dossier", "content/dataset-v18"], { env, stdio: ["ignore", "pipe", "pipe"] });
  const db = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { db: { schema: "histoire" }, auth: { persistSession: false } });
  const publicDb = createClient(status.API_URL, status.ANON_KEY, { db: { schema: "histoire" }, auth: { persistSession: false } });
  const cartes = chargerCartes();
  const lire = async () => {
    const { data, error } = await db.from("chapter_cards").select("*").order("card_id");
    if (error) throw error;
    return data;
  };
  importer();
  const premier = await lire();
  assert.deepEqual(premier, [...cartes].sort((a, b) => a.card_id.localeCompare(b.card_id)));
  importer();
  assert.deepEqual(await lire(), premier, "Second import différent");
  const { count, error: erreurCompte } = await db.from("events").select("id", { count: "exact", head: true });
  assert.ifError(erreurCompte);
  assert.equal(count, 2001);
  for (const carte of cartes.filter((c) => c.event_id)) {
    const e = lireCsv("content/dataset-v18/kiffeurs-events-v18.csv").find((e) => e.event_id === carte.event_id)!;
    const { data, error } = await db.from("event_answers").select("start_year,start_month,start_day,end_year,end_month,end_day,date_text").eq("event_id", carte.event_id).single();
    assert.ifError(error);
    assert.deepEqual(data, Object.fromEntries(Object.keys(data!).map((k) => [k, k === "date_text" ? e[k] : e[k] ? Number(e[k]) : null])));
  }
  const { data: publiques, error: erreurLecture } = await publicDb.from("chapter_cards").select("*").order("card_id");
  assert.ifError(erreurLecture);
  assert.deepEqual(publiques, premier, "Lecture anon incomplète");
  for (const requete of [
    publicDb.from("chapter_cards").insert(cartes[0]),
    publicDb.from("chapter_cards").update({ title: "interdit" }).eq("card_id", cartes[0].card_id),
    publicDb.from("chapter_cards").delete().eq("card_id", cartes[0].card_id),
    publicDb.rpc("replace_chapter_cards", { p_cards: cartes }),
  ]) assert.equal((await requete).error?.code, "42501");

  // Échec en fin de transaction : les anciennes cartes doivent rester intactes.
  const invalides = [...cartes.slice(0, -1), { ...cartes.at(-1)!, event_id: "EVT-INCONNU" }];
  await assert.rejects(importerCartesLocales(invalides, status.API_URL, status.SERVICE_ROLE_KEY));
  assert.deepEqual(await lire(), premier, "Lot partiellement supprimé après échec");
  // Un chapitre absent du lot n'est jamais touché ; un ordre peut être permuté.
  const groupe = cartes.filter((c) => c.chapter_id === "THM-005");
  const permute = groupe.map((c) => ({ ...c, sort_order: c.sort_order === 2 ? 3 : c.sort_order === 3 ? 2 : c.sort_order }));
  await importerCartesLocales(permute, status.API_URL, status.SERVICE_ROLE_KEY);
  assert.deepEqual((await lire())!.filter((c) => c.chapter_id !== "THM-005"), premier!.filter((c) => c.chapter_id !== "THM-005"));
  // Retirer une carte du CSV supprime réellement l'ancienne ligne de son chapitre.
  await importerCartesLocales(groupe.slice(0, -1), status.API_URL, status.SERVICE_ROLE_KEY);
  assert.equal((await lire())!.filter((c) => c.chapter_id === "THM-005").length, 7);
  await importerCartesLocales(cartes, status.API_URL, status.SERVICE_ROLE_KEY);
  assert.deepEqual(await lire(), premier);
  console.log("OK : 2001 événements, 37 cartes, références et dates v18, import idempotent/atomique, périmètre par chapitre, lecture publique et écritures anon refusées.");
}

verifier().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
