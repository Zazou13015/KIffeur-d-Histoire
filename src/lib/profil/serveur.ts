import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cursorValide, type Historique, type Statistiques } from "./types";

// Aucune identité fournie par le navigateur ; aucune mise en cache partagée.
async function clientPrive(client?: SupabaseClient) {
  const supabase = client ?? (await createClient({ noStore: true }));
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Connexion requise.");
  return supabase.schema("histoire");
}
export async function chargerHistorique(
  cursor: unknown,
  client?: SupabaseClient,
): Promise<Historique> {
  const histoire = await clientPrive(client);
  const { data, error } = await histoire.rpc("player_history", {
    p_cursor: cursorValide(cursor),
  });
  if (error || !data)
    throw new Error("L’historique est momentanément indisponible.");
  return data as Historique;
}
export async function chargerStatistiques(
  client?: SupabaseClient,
): Promise<Statistiques> {
  const histoire = await clientPrive(client);
  const { data, error } = await histoire.rpc("player_stats");
  if (error || !data)
    throw new Error("Les statistiques sont momentanément indisponibles.");
  return data as Statistiques;
}
