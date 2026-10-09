// Outils communs aux tests de bout en bout : pile Supabase LOCALE uniquement.
import { execFileSync } from "node:child_process";

export const CONTENEUR_DB = "supabase_db_kiffeurs-histoire";

/** Compte fictif créé par e2e/preparer.ts dans la base locale jetable. */
export const COMPTE_TEST = { email: "e2e-joueur@example.test", motDePasse: "E2e-local-seulement-27!", pseudo: "Joueur E2E" };

type Statut = { API_URL: string; ANON_KEY: string; SERVICE_ROLE_KEY: string };

let statut: Statut | undefined;

/** Adresse et clés de la pile locale (`supabase status`), lues sans jamais les afficher. */
export function statutLocal(): Statut {
  statut ??= JSON.parse(
    execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "--output", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ) as Statut;
  return statut;
}

/** Requête SQL lue dans la base locale, résultat en JSON (une ligne `json_agg`). */
export function lireSql<T>(sql: string): T {
  const sortie = execFileSync(
    "docker",
    ["exec", "-i", CONTENEUR_DB, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-qtA", "-f", "-"],
    { input: `select coalesce(json_agg(t), '[]') from (${sql}) t;`, encoding: "utf8" },
  );
  return JSON.parse(sortie.trim()) as T;
}

/** Instruction SQL sur la base locale (nettoyage avant un parcours). */
export function executerSql(sql: string) {
  execFileSync("docker", ["exec", "-i", CONTENEUR_DB, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"], { input: sql });
}
