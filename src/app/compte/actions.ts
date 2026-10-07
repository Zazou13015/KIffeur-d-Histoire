"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { accountDestination } from "@/lib/account";
import { authCallbackUrl, safeNextPath } from "@/lib/authRedirect";
import { cleanUsername, isUsernameTaken, saveProfileUsername, validateUsername } from "@/lib/profiles";
import { completePendingProfile } from "@/lib/pendingProfile";

export type AccountState = { error?: string; message?: string };
async function siteOrigin() {
  const requestHeaders = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? requestHeaders.get("origin");
  if (!origin) throw new Error("Adresse du site indisponible.");
  const url = new URL(origin);
  if (!/^https?:$/.test(url.protocol) || (!process.env.NEXT_PUBLIC_SITE_URL && url.host !== requestHeaders.get("host"))) {
    throw new Error("Adresse du site invalide.");
  }
  return url.origin;
}
const field = (form: FormData, name: string) => String(form.get(name) ?? "");
function passwordError(form: FormData) {
  if (field(form, "password").length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (field(form, "password") !== field(form, "confirmation")) return "Les mots de passe ne correspondent pas.";
  return null;
}

export async function register(_state: AccountState, form: FormData): Promise<AccountState> {
  const username = cleanUsername(field(form, "username"));
  const validation = validateUsername(username) ?? passwordError(form);
  if (validation) return { error: validation };
  const next = safeNextPath(field(form, "next"));
  const client = await createClient();
  let result;
  try {
    if (await isUsernameTaken(client, username)) return { error: "Ce pseudo est déjà pris." };
    result = await client.auth.signUp({
      email: field(form, "email").trim(), password: field(form, "password"),
      options: { emailRedirectTo: authCallbackUrl(await siteOrigin(), next) },
    });
  } catch { return { error: "Inscription indisponible pour le moment. Réessaie." }; }
  if (result.error) return { error: "Impossible de créer le compte. Vérifie les informations ou réessaie." };
  // Intention liée au compte créé par Auth. Aucun mot de passe ni token.
  const userId = result.data.user?.id;
  if (userId) {
    (await cookies()).set("histoire-pending-username", JSON.stringify({ userId, username }), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400,
    });
  }
  if (result.data.session) {
    await completePendingProfile(client);
    redirect(await accountDestination(client, next));
  }
  return { message: "Si l’inscription est possible, un email de confirmation a été envoyé. Ouvre-le dans ce navigateur pour terminer ; le pseudo sera vérifié à nouveau." };
}

export async function updateUsername(_state: AccountState, form: FormData): Promise<AccountState> {
  const client = await createClient();
  const { error } = await saveProfileUsername(client, field(form, "username"));
  if (error) return { error };
  await completePendingProfile(client);
  revalidatePath("/", "layout");
  redirect(safeNextPath(field(form, "next")));
}

export async function requestPasswordReset(_state: AccountState, form: FormData): Promise<AccountState> {
  try {
    const client = await createClient();
    const { error } = await client.auth.resetPasswordForEmail(field(form, "email").trim(), {
      redirectTo: authCallbackUrl(await siteOrigin(), "/nouveau-mot-de-passe"),
    });
    if (error) return { error: "Demande indisponible pour le moment. Réessaie." };
  } catch { return { error: "Demande indisponible pour le moment. Réessaie." }; }
  return { message: "Si ce compte existe, un email permettant de changer le mot de passe a été envoyé." };
}

export async function resetPassword(_state: AccountState, form: FormData): Promise<AccountState> {
  const validation = passwordError(form);
  if (validation) return { error: validation };
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { error: "Ce lien a expiré. Demande un nouvel email de réinitialisation." };
  const { error } = await client.auth.updateUser({ password: field(form, "password") });
  if (error) return { error: "Impossible de changer le mot de passe. Vérifie ses règles et réessaie." };
  return { message: "Ton mot de passe KFFR a été modifié pour les deux jeux." };
}
