import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileUsername, saveProfileUsername, validateUsername } from "./profiles";

// Appeler seulement dans une action/route, qui peut supprimer le cookie.
export async function completePendingProfile(client: SupabaseClient) {
  const store = await cookies();
  const pending = store.get("histoire-pending-username")?.value;
  if (!pending) return;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return;
  // Un pseudo déjà choisi dans Contrée est toujours prioritaire.
  if (!(await getProfileUsername(client, user.id)) && !validateUsername(pending)) {
    await saveProfileUsername(client, pending);
  }
  store.delete("histoire-pending-username");
}
