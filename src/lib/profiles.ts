import type { SupabaseClient } from "@supabase/supabase-js";

// Règles reprises de Contree-KFFR/lib/profiles.ts (identité KFFR commune).
export const MAX_USERNAME_LENGTH = 40;
export function cleanUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
export function validateUsername(value: string): string | null {
  const username = cleanUsername(value);
  if (!username) return "Choisis un pseudo.";
  if (username.length > MAX_USERNAME_LENGTH) return `Le pseudo ne peut pas dépasser ${MAX_USERNAME_LENGTH} caractères.`;
  if (/[\u0000-\u001f\u007f]/.test(username)) return "Ce pseudo contient des caractères non autorisés.";
  return null;
}
export function profileErrorMessage(error: { code?: string } | null): string {
  return error?.code === "23505" ? "Ce pseudo est déjà pris."
    : "Impossible d’enregistrer le pseudo pour le moment. Réessaie.";
}
export async function getProfileUsername(client: SupabaseClient, userId: string) {
  const { data, error } = await client.schema("public").from("profiles")
    .select("username").eq("id", userId).maybeSingle<{ username: string | null }>();
  if (error) throw new Error("Impossible de lire le profil KFFR. Réessaie.");
  return data?.username ?? null;
}
export async function isUsernameTaken(client: SupabaseClient, value: string) {
  // RPC EXISTANTE de Contrée : aucune nouvelle fonction/policy dans public.
  const { data, error } = await client.schema("public").rpc("is_username_taken", { p_username: cleanUsername(value) });
  if (error) throw new Error("Impossible de vérifier le pseudo pour le moment. Réessaie.");
  return data === true;
}
export async function saveProfileUsername(client: SupabaseClient, value: string) {
  const validation = validateUsername(value);
  if (validation) return { error: validation };
  // L'identifiant vient exclusivement d'Auth, jamais d'un formulaire.
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { error: "Connecte-toi pour choisir ton pseudo." };
  const username = cleanUsername(value);
  const { data, error } = await client.schema("public").from("profiles")
    .update({ username }).eq("id", user.id).select("username").maybeSingle();
  if (error) return { error: profileErrorMessage(error) };
  if (!data) {
    const { error: insertError } = await client.schema("public").from("profiles").insert({ id: user.id, username });
    if (insertError) return { error: profileErrorMessage(insertError) };
  }
  return { error: null };
}
