"use client";

import { useActionState } from "react";
import { register, requestPasswordReset, resetPassword, updateUsername, type AccountState } from "@/app/compte/actions";

type Kind = "register" | "profile" | "forgot" | "reset";
const actions = { register, profile: updateUsername, forgot: requestPasswordReset, reset: resetPassword };
const labels = { register: "Créer mon compte KFFR", profile: "Enregistrer le pseudo", forgot: "Envoyer le lien", reset: "Changer le mot de passe" };
export default function AccountForm({ kind, next = "/profil", username = "" }: { kind: Kind; next?: string; username?: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(actions[kind], {});
  return <form action={action} className="flex flex-col gap-3">
    <input type="hidden" name="next" value={next} />
    {(kind === "register" || kind === "profile") && <label>Pseudo KFFR
      <input name="username" required maxLength={40} defaultValue={username} autoComplete="nickname" className="block w-full rounded border px-3 py-2" />
    </label>}
    {(kind === "register" || kind === "forgot") && <label>Email
      <input name="email" type="email" required autoComplete="email" className="block w-full rounded border px-3 py-2" />
    </label>}
    {(kind === "register" || kind === "reset") && <>
      <label>Nouveau mot de passe<input name="password" type="password" required minLength={6} autoComplete="new-password" className="block w-full rounded border px-3 py-2" /></label>
      <label>Confirmer le mot de passe<input name="confirmation" type="password" required minLength={6} autoComplete="new-password" className="block w-full rounded border px-3 py-2" /></label>
    </>}
    {state.error && <p role="alert">{state.error}</p>}
    {state.message && <p role="status">{state.message}</p>}
    <button disabled={pending} type="submit" className="rounded bg-stone-900 px-3 py-2 text-white">{pending ? "En cours…" : labels[kind]}</button>
  </form>;
}
