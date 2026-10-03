import { signIn } from "./actions";

export default async function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  const { erreur } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="text-sm text-stone-600">
        Utilise le même email et le même mot de passe que sur KFFR contrée.
      </p>
      {erreur && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
          Email ou mot de passe incorrect.
        </p>
      )}
      <form action={signIn} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="Email" autoComplete="email"
          className="rounded border border-stone-300 px-3 py-2" />
        <input name="password" type="password" required placeholder="Mot de passe"
          autoComplete="current-password" className="rounded border border-stone-300 px-3 py-2" />
        <button type="submit" className="rounded bg-stone-900 px-3 py-2 font-medium text-white">
          Se connecter
        </button>
      </form>
    </main>
  );
}
