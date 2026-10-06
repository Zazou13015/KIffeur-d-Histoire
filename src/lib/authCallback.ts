import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNextPath } from "./authRedirect";

// Le client SSR échange le code PKCE et écrit la session dans les cookies.
export async function completeAuthCallback(client: SupabaseClient, url: URL): Promise<string> {
  if (url.searchParams.has("error") || url.searchParams.has("error_code")) {
    throw new Error("Connexion OAuth refusée.");
  }
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Code OAuth manquant.");
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) throw new Error("Connexion OAuth impossible.");
  return safeNextPath(url.searchParams.get("next"));
}
