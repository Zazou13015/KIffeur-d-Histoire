import type { Metadata } from "next";
import { Badge, BadgeDifficulte, BadgeNiveau } from "@/components/ui/Badge";
import { BarreProgression } from "@/components/ui/BarreProgression";
import { Bouton } from "@/components/ui/Bouton";
import { CarteEvenement } from "@/components/ui/CarteEvenement";
import { ChronoCirculaire } from "@/components/ui/ChronoCirculaire";
import { DemoModale } from "./DemoModale";

export const metadata: Metadata = { title: "Charte graphique · Kiffeurs d'Histoire" };

const COULEURS = [
  ["encre", "bg-encre"],
  ["encre-douce", "bg-encre-douce"],
  ["papier", "bg-papier"],
  ["blanc-cartel", "bg-blanc-cartel"],
  ["vert-de-gris", "bg-vert-de-gris"],
  ["laiton", "bg-laiton"],
  ["laiton-clair", "bg-laiton-clair"],
  ["oxyde", "bg-oxyde"],
  ["sauge", "bg-sauge"],
  ["filet", "bg-filet"],
  ["fond-resultat", "bg-fond-resultat"],
] as const;

const EPOQUES = [
  ["Préhistoire", "bg-epoque-prehistoire"],
  ["Antiquité", "bg-epoque-antiquite"],
  ["Moyen Âge", "bg-epoque-moyen-age"],
  ["Temps modernes", "bg-epoque-temps-modernes"],
  ["Époque contemporaine", "bg-epoque-contemporaine"],
] as const;

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-3">
      <h3 className="text-xl">{titre}</h3>
      {children}
    </section>
  );
}

// Tout le catalogue, rendu dans un thème donné.
function Catalogue() {
  return (
    <div className="grid grid-cols-1 gap-8">
      <Bloc titre="Couleurs">
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
          {COULEURS.map(([nom, classe]) => (
            <li key={nom} className="flex items-center gap-2 text-[13px]">
              <span className={`${classe} h-8 w-8 flex-none border border-filet`} />
              <span className="font-mono">{nom}</span>
            </li>
          ))}
        </ul>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {EPOQUES.map(([nom, classe]) => (
            <li key={nom} className={`${classe} border border-filet px-2 py-1 text-[13px]`}>
              {nom}
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Typographies">
        <p className="m-0 font-titre text-3xl leading-tight">Titres : Young Serif</p>
        <p className="m-0">Texte courant : Atkinson Hyperlegible, pensée pour être lisible par tous.</p>
        <p className="date m-0 text-5xl leading-none text-oxyde">1789 · 14 juillet</p>
        <p className="inventaire m-0">Inv. MOD-0412 · Histoire moderne</p>
      </Bloc>

      <Bloc titre="Boutons">
        <div className="flex flex-wrap gap-2">
          <Bouton>Valider ma réponse</Bouton>
          <Bouton variante="secondaire">Rejouer</Bouton>
          <Bouton variante="oxyde">Abandonner</Bouton>
          <Bouton disabled>Indisponible</Bouton>
          <Bouton href="/charte" variante="secondaire">
            Lien en bouton
          </Bouton>
        </div>
      </Bloc>

      <Bloc titre="Badges">
        <div className="flex flex-wrap gap-2">
          <BadgeNiveau niveau="Terminale" />
          <BadgeNiveau niveau="CM1" />
          <BadgeDifficulte niveau="facile" />
          <BadgeDifficulte niveau="moyen" />
          <BadgeDifficulte niveau="difficile" />
          <Badge ton="neutre">Culture générale</Badge>
        </div>
      </Bloc>

      <Bloc titre="Carte événement">
        <div className="max-w-sm">
          <CarteEvenement
            motif="bastille"
            inventaire="Inv. MOD-0412 · Histoire moderne"
            titre="Prise de la Bastille"
            description="Le peuple de Paris s'empare de la forteresse royale, symbole de l'arbitraire."
            pied={
              <>
                <BadgeNiveau niveau="4e" />
                <BadgeDifficulte niveau="facile" />
              </>
            }
          />
        </div>
      </Bloc>

      <Bloc titre="Chrono circulaire">
        <div className="flex flex-wrap items-center gap-4">
          <ChronoCirculaire restant={24} total={30} />
          <ChronoCirculaire restant={15} total={30} />
          <ChronoCirculaire restant={5} total={30} />
          <ChronoCirculaire restant={0} total={30} />
        </div>
      </Bloc>

      <Bloc titre="Barre de progression">
        <div className="grid max-w-md gap-4">
          <BarreProgression numero={1} total={10} />
          <BarreProgression numero={4} total={10} />
          <BarreProgression numero={10} total={10} />
        </div>
      </Bloc>

      <Bloc titre="Modale">
        <div>
          <DemoModale />
        </div>
      </Bloc>
    </div>
  );
}

export default function Charte() {
  return (
    <main className="conteneur grid flex-1 grid-cols-1 gap-8 py-8">
      <header className="grid gap-2">
        <span className="inventaire">Charte graphique · version 1</span>
        <h1 className="text-4xl leading-tight">Cabinet de curiosités</h1>
        <p className="m-0 max-w-prose text-encre-douce">
          Les couleurs, les polices et les composants que tous les écrans du jeu réutilisent, montrés en thème clair et en
          thème sombre. Le thème clair est celui du site ; le thème sombre est prêt pour quand on voudra l&apos;activer.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section aria-label="Thème clair" className="min-w-0 border border-filet bg-papier p-5 text-encre">
          <h2 className="mb-5 text-2xl">Thème clair</h2>
          <Catalogue />
        </section>
        <section
          data-theme="dark"
          aria-label="Thème sombre"
          className="min-w-0 border border-filet bg-papier p-5 text-encre"
        >
          <h2 className="mb-5 text-2xl">Thème sombre</h2>
          <Catalogue />
        </section>
      </div>
    </main>
  );
}
