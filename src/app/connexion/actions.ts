"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/authRedirect";
import { accountDestination } from "@/lib/account";
import { completePendingProfile } from "@/lib/pendingProfile";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (error) redirect(`/connexion?erreur=1${next === "/" ? "" : `&next=${encodeURIComponent(next)}`}`);
  await completePendingProfile(supabase);
  redirect(await accountDestination(supabase, next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
