import { notFound } from "next/navigation";
import { CHAPITRES, trouverChapitre } from "@/lib/apprendre/catalogue";
import { chargerCartesChapitre } from "@/lib/apprendre/cartes-serveur";
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
  return <main className="flex flex-1 flex-col">
    <DecouvrirChapitre cartes={cartes} chapitre={{ titre: c.titre, niveau: c.niveau }} />
  </main>;
}
