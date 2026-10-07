import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAPITRES, trouverChapitre } from "@/lib/apprendre/catalogue";
import { chargerCartesChapitre } from "@/lib/apprendre/cartes-serveur";
import { BadgeNiveau } from "@/components/ui/Badge";
import { DecouvrirChapitre } from "@/components/pedagogie/DecouvrirChapitre";

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;
export function generateStaticParams() {
  return CHAPITRES.map((c) => ({ niveau: c.niveauSlug, chapitre: c.slug }));
}
export async function generateMetadata({ params }: PageProps<"/apprendre/[niveau]/[chapitre]">) {
  const { niveau, chapitre } = await params;
  const c = trouverChapitre(niveau, chapitre);
  return { title: c ? `${c.titre} · ${c.niveau} · Kiffeurs d’Histoire` : "Chapitre introuvable" };
}
export default async function ChapitrePage({ params }: PageProps<"/apprendre/[niveau]/[chapitre]">) {
  const { niveau, chapitre } = await params;
  const c = trouverChapitre(niveau, chapitre);
  if (!c) notFound();
  const cartes = await chargerCartesChapitre(c.id);
  if (!cartes.length) notFound();
  return <main className="conteneur grid min-w-0 flex-1 content-start gap-7 py-8">
    <Link href="/apprendre" className="cible inline-flex w-fit items-center underline">← Choisir un autre chapitre</Link>
    <header className="grid min-w-0 gap-3 border-b border-filet pb-5">
      <div className="flex flex-wrap items-center gap-3"><BadgeNiveau niveau={c.niveau} /><span className="text-sm">{cartes.length} cartes</span></div>
      <h1 className="max-w-4xl break-words text-3xl leading-tight sm:text-4xl">{c.titre}</h1>
    </header>
    <DecouvrirChapitre cartes={cartes} />
  </main>;
}
