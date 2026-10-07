import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signIn } from "./actions";
import { safeNextPath } from "@/lib/authRedirect";
import GoogleSignInButton from "./GoogleSignInButton";
import Link from "next/link";

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  if (!isSupabaseConfigured) redirect("/");
  const { erreur, next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="text-sm text-stone-600">
        Utilise ton compte KFFR contrée, avec Google ou ton email et ton mot de passe.
      </p>
      {erreur && (
        <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
          {erreur === "oauth" ? "Connexion Google impossible. Réessaie." : "Email ou mot de passe incorrect."}
        </p>
      )}
      <GoogleSignInButton next={nextPath} />
      <div role="separator" aria-label="ou" className="flex items-center gap-3 text-sm text-stone-600">
        <span aria-hidden="true" className="h-px flex-1 bg-stone-300" />
        <span>ou</span>
        <span aria-hidden="true" className="h-px flex-1 bg-stone-300" />
      </div>
      <form action={signIn} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={nextPath} />
        <input name="email" type="email" required placeholder="Email" autoComplete="email"
          className="rounded border border-stone-300 px-3 py-2" />
        <input name="password" type="password" required placeholder="Mot de passe"
          autoComplete="current-password" className="rounded border border-stone-300 px-3 py-2" />
        <button type="submit" className="rounded bg-stone-900 px-3 py-2 font-medium text-white">
          Se connecter
        </button>
      </form>
      <Link href={`/inscription?next=${encodeURIComponent(nextPath)}`}>Créer un compte KFFR</Link>
      <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>
    </main>
  );
}
