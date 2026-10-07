import { redirect } from "next/navigation";
import AccountForm from "@/components/AccountForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export default function ForgotPasswordPage() {
  if (!isSupabaseConfigured) redirect("/");
  return <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-5 px-4 py-12">
    <h1 className="text-2xl">Mot de passe oublié</h1><AccountForm kind="forgot" />
  </main>;
}
