import { notFound, redirect } from "next/navigation";
import { getAccount } from "@/lib/account";
import { chargerPacks, chargerQuestions } from "@/lib/admin-packs/serveur";
import AdministrationPacks from "@/components/admin/AdministrationPacks";

export const metadata = {
  title: "Administration des packs · Kiffeurs d’Histoire",
  robots: { index: false, follow: false },
};

export default async function PacksPage({ searchParams }: { searchParams: Promise<{ pack?: string | string[] }> }) {
  const account = await getAccount();
  if (!account) redirect(`/connexion?next=${encodeURIComponent("/admin/packs")}`);
  const packs = await chargerPacks();
  if (!packs) notFound();
  const { pack } = await searchParams;
  const selected = pack === undefined ? packs[0] : packs.find((p) => p.id === pack);
  if (pack !== undefined && !selected) notFound();
  const questions = selected ? await chargerQuestions(selected.id) : [];
  if (!questions) notFound();

  return <AdministrationPacks key={selected?.id ?? "vide"} initialPacks={packs}
    selectedId={selected?.id ?? null} initialQuestions={questions} />;
}
