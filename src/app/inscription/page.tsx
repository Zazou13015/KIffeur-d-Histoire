import Link from "next/link";
import { redirect } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import GoogleSignInButton from "@/app/connexion/GoogleSignInButton";
import { safeNextPath } from "@/lib/authRedirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function InscriptionPage({ searchParams }: PageProps<"/inscription">) {
  if (!isSupabaseConfigured) redirect("/");
  const { next } = await searchParams;
  const destination = safeNextPath(typeof next === "string" ? next : null);
  return <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-5 px-4 py-12">
    <h1 className="text-2xl">Créer un compte KFFR</h1>
    <p>Ton compte et ton pseudo sont communs à Histoire et Contrée. Si tu as déjà un compte, connecte-toi.</p>
    <AccountForm kind="register" next={destination} />
    <GoogleSignInButton next={destination} />
    <Link href={`/connexion?next=${encodeURIComponent(destination)}`}>J’ai déjà un compte</Link>
  </main>;
}
