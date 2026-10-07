import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileUsername, saveProfileUsername, validateUsername } from "./profiles";

function parsePendingProfile(value: string): { userId: string; username: string } | null {
  try {
    const pending: unknown = JSON.parse(value);
    if (!pending || typeof pending !== "object" || !("userId" in pending) || !("username" in pending)) return null;
    if (typeof pending.userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pending.userId)) return null;
    if (typeof pending.username !== "string" || validateUsername(pending.username)) return null;
    return { userId: pending.userId, username: pending.username };
  } catch {
    return null;
  }
}

// Appeler seulement dans une action/route, qui peut supprimer le cookie.
export async function completePendingProfile(client: SupabaseClient) {
  const store = await cookies();
  const value = store.get("histoire-pending-username")?.value;
  if (!value) return;
  const pending = parsePendingProfile(value);
  // Les anciennes intentions sans compte associé ne peuvent pas être appliquées.
  if (!pending) {
    store.delete("histoire-pending-username");
    return;
  }
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return;
  // Une connexion à B conserve l'intention de A jusqu'à sa confirmation/expiration.
  if (pending.userId !== user.id) return;
  // Un pseudo déjà choisi dans Contrée est toujours prioritaire.
  if (!(await getProfileUsername(client, user.id))) {
    const { error: saveError } = await saveProfileUsername(client, pending.username);
    if (saveError) return;
  }
  store.delete("histoire-pending-username");
}
