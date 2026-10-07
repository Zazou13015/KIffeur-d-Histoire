import Link from "next/link";
import AccountForm from "@/components/AccountForm";
import { getAccount } from "@/lib/account";
export default async function ResetPasswordPage() {
  const account = await getAccount();
  return <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-5 px-4 py-12">
    <h1 className="text-2xl">Nouveau mot de passe KFFR</h1>
    {account ? <AccountForm kind="reset" /> : <p>Ce lien a expiré. <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link></p>}
  </main>;
}
