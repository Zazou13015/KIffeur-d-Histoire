import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { getProfileUsername } from "./profiles";
import { safeNextPath } from "./authRedirect";

export async function getAccount(client?: SupabaseClient) {
  if (!isSupabaseConfigured) return null;
  const supabase = client ?? await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { error: playerError } = await supabase.schema("histoire").rpc("ensure_player");
  if (playerError) throw new Error("Impossible d’ouvrir le compte Histoire. Réessaie.");
  return { user, username: await getProfileUsername(supabase, user.id) };
}
export async function accountDestination(client: SupabaseClient, next: string) {
  const account = await getAccount(client);
  const destination = safeNextPath(next);
  return account && !account.username && !/^\/profil(?:[?#]|$)/.test(destination) && destination !== "/nouveau-mot-de-passe"
    ? `/profil?next=${encodeURIComponent(destination)}` : destination;
}
