import type { Metadata } from "next";
import { lancer } from "@/app/partie/actions";
import { Bouton } from "@/components/ui/Bouton";

export const metadata: Metadata = { title: "Nouvelle partie · Kiffeurs d'Histoire" };

const DIFFICULTES = [
  { valeur: "YEAR", titre: "Facile", aide: "Tu donnes l'année." },
  { valeur: "MONTH", titre: "Moyen", aide: "Tu donnes le mois et l'année." },
  { valeur: "DAY", titre: "Difficile", aide: "Tu donnes le jour exact." },
];

// Lancement minimal d'une partie solo. L'accueil et le choix du mode (3.5) viendront s'y brancher.
export default async function NouvellePartie({ searchParams }: PageProps<"/partie/nouvelle">) {
  const { erreur } = await searchParams;
  return (
    <main className="conteneur grid flex-1 grid-cols-1 content-start gap-6 py-8">
      <header className="grid gap-2">
        <span className="inventaire">Solo · 10 questions</span>
        <h1 className="text-4xl leading-tight">Nouvelle partie</h1>
        <p className="m-0 max-w-prose text-encre-douce">Dix événements à placer sur la frise, trente secondes chacun. Choisis la précision demandée.</p>
      </header>
      {erreur && (
        <p role="alert" className="m-0 border border-oxyde bg-fond-resultat px-4 py-3 text-oxyde">
          Impossible de lancer une partie pour le moment. Réessaie dans un instant.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {DIFFICULTES.map((d) => (
          <form key={d.valeur} action={lancer} className="grid gap-2 border border-filet bg-blanc-cartel p-4">
            <input type="hidden" name="difficulte" value={d.valeur} />
            <h2 className="text-2xl">{d.titre}</h2>
            <p className="m-0 text-encre-douce">{d.aide}</p>
            <Bouton type="submit">Jouer</Bouton>
          </form>
        ))}
      </div>
    </main>
  );
}
