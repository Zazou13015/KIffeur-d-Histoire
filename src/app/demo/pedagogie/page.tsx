import type { Metadata } from "next";
import { DemoPedagogie } from "./DemoPedagogie";
import { chargerDemoPedagogie } from "./donnees";

export const metadata: Metadata = { title: "Démonstration · cartes pédagogiques" };
// En-tête anonyme au build : aucun compte ni cookie Supabase nécessaire,
// même lorsque Vercel dispose des variables de la base partagée.
export const dynamic = "force-static";

export default function PageDemoPedagogie() {
  return (
    <main className="conteneur grid flex-1 content-start gap-8 py-8">
      <header className="grid gap-3">
        <span className="inventaire">Lot pilote · issue #21</span>
        <h1 className="text-4xl leading-tight">Démonstration · cartes pédagogiques</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Quatre chapitres, trente-sept cartes à relire. Cette démonstration permet
          d’évaluer les textes et leur lisibilité avant la réalisation du mode pédagogique.
        </p>
      </header>
      <DemoPedagogie chapitres={chargerDemoPedagogie()} />
    </main>
  );
}
