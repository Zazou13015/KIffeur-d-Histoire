import Link from "next/link";
import { getAccount } from "@/lib/account";
import { signOut } from "@/app/connexion/actions";
import { EnTete } from "@/components/ui/EnTete";
import ProfileRefresh from "./ProfileRefresh";

export default async function AccountHeader() {
  const account = await getAccount();
  return <EnTete>
    {account ? <nav aria-label="Compte" className="flex flex-wrap items-center gap-x-4">
      <ProfileRefresh />
      {account.username ? <><span>{account.username}</span><Link href="/profil" className="cible inline-flex items-center">Profil</Link></>
        : <Link href="/profil" className="cible inline-flex items-center">Choisir un pseudo</Link>}
      <form action={signOut}><button type="submit" className="cible underline">Déconnexion</button></form>
    </nav> : <Link href="/connexion" className="cible inline-flex items-center">Connexion</Link>}
  </EnTete>;
}
