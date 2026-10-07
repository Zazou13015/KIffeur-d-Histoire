import { redirect } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import { getAccount } from "@/lib/account";
import { safeNextPath } from "@/lib/authRedirect";
import { signOut } from "@/app/connexion/actions";

export default async function ProfilPage({ searchParams }: PageProps<"/profil">) {
  const { next } = await searchParams;
  const destination = typeof next === "string" ? safeNextPath(next) : "/profil";
  const account = await getAccount();
  if (!account) redirect(`/connexion?next=${encodeURIComponent(`/profil?next=${encodeURIComponent(destination)}`)}`);
  return <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-5 px-4 py-12">
    <h1 className="text-2xl">Profil KFFR</h1>
    <p>Email : {account.user.email}</p>
    <p>{account.username ? `Pseudo actuel : ${account.username}` : "Choisis ton pseudo pour sauvegarder tes parties."}</p>
    <p>Le nouveau pseudo sera aussi utilisé dans KFFR Contrée.</p>
    <AccountForm kind="profile" username={account.username ?? ""} next={destination} />
    <form action={signOut}><button type="submit" className="underline">Déconnexion</button></form>
  </main>;
}
