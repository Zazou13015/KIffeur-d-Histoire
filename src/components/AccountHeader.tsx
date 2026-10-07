import Link from "next/link";
import { getAccount } from "@/lib/account";
import { signOut } from "@/app/connexion/actions";
import ProfileRefresh from "./ProfileRefresh";

export default async function AccountHeader() {
  const account = await getAccount();
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 text-sm">
    <Link href="/">Kiffeurs d’Histoire</Link>
    {account ? <nav aria-label="Compte" className="flex items-center gap-4">
      <ProfileRefresh />
      {account.username ? <><span>{account.username}</span><Link href="/profil">Profil</Link></>
        : <Link href="/profil">Choisir un pseudo</Link>}
      <form action={signOut}><button type="submit" className="underline">Déconnexion</button></form>
    </nav> : <Link href="/connexion">Connexion</Link>}
  </header>;
}
