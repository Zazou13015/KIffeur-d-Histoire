// Envoie les illustrations de content/illustrations/ dans le bucket Storage `histoire-illustrations`
// et renseigne histoire.events.image_path.
// Usage : npm run content:illustrations
// Connexion : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY, lus dans l'environnement ou dans .env.local.
// Idempotent : relancer remplace les fichiers et le chemin sans créer de doublon.
// Les fichiers sont nommés <event_id>.svg et pèsent 8 Ko au maximum (docs/prd.md, « Illustrations »).

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "histoire-illustrations";
const DOSSIER = "content/illustrations";
const POIDS_MAX = 8 * 1024;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");

const supabase = createClient(url, cle, { db: { schema: "histoire" }, auth: { persistSession: false } });

const fichiers = readdirSync(DOSSIER).filter((f) => /^EVT-\d+\.svg$/.test(f));
for (const f of fichiers) {
  const poids = statSync(path.join(DOSSIER, f)).size;
  if (poids > POIDS_MAX) throw new Error(`${f} pèse ${poids} octets (maximum ${POIDS_MAX}).`);
}

const { error: erreurBucket } = await supabase.storage.createBucket(BUCKET, { public: true });
if (erreurBucket && !/already exists/i.test(erreurBucket.message)) throw erreurBucket;

let envoyes = 0;
for (const f of fichiers) {
  const eventId = f.replace(".svg", "");
  const { error: e1 } = await supabase.storage
    .from(BUCKET)
    .upload(f, readFileSync(path.join(DOSSIER, f)), { contentType: "image/svg+xml", upsert: true });
  if (e1) throw new Error(`Envoi de ${f} : ${e1.message}`);
  const { data, error: e2 } = await supabase.from("events").update({ image_path: f }).eq("id", eventId).select("id");
  if (e2) throw new Error(`Mise à jour de ${eventId} : ${e2.message}`);
  if (!data?.length) console.warn(`Événement ${eventId} introuvable en base, chemin non renseigné.`);
  envoyes++;
}
console.log(`${envoyes} illustrations envoyées dans ${BUCKET}.`);
